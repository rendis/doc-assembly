#!/usr/bin/env python3
"""
docml2json.py — Convert .docml metalanguage to PortableDocument v1.1.0 JSON.

Usage:
    python3 docml2json.py input.docml                    # → input.json
    python3 docml2json.py input.docml -o output.json     # → output.json
    python3 docml2json.py *.docml                         # batch mode
"""

import re
import json
import uuid
import sys
import os
import argparse
from datetime import datetime, timezone

NAMESPACE = uuid.NAMESPACE_URL
VERSION = "1.1.0"
SOURCE_APP = f"doc-assembly-web/{VERSION}"

PAGE_SIZES = {
    "LETTER": {"width": 816, "height": 1056},
    "LEGAL":  {"width": 816, "height": 1344},
    "A4":     {"width": 794, "height": 1123},
}


def make_id(seed):
    """Generate a stable, reproducible UUID5 from a seed string."""
    return str(uuid.uuid5(NAMESPACE, seed))


# =============================================================================
# Section Splitting
# =============================================================================

def split_sections(text):
    """Split .docml text into named sections.
    Once ---content--- is found, everything after is content (no further markers)."""
    sections = {}
    current = None
    current_lines = []
    in_content = False

    for line in text.split('\n'):
        if in_content:
            current_lines.append(line)
            continue

        m = re.match(r'^---(\w+)---\s*$', line)
        if m:
            if current is not None:
                sections[current] = current_lines
            current = m.group(1)
            current_lines = []
            if current == 'content':
                in_content = True
        elif current is not None:
            current_lines.append(line)

    if current is not None:
        sections[current] = current_lines

    return sections


# =============================================================================
# Meta Parsing
# =============================================================================

def parse_meta(lines):
    kv = {}
    for line in lines:
        line = line.strip()
        if not line:
            continue
        key, _, value = line.partition(':')
        kv[key.strip()] = value.strip()

    page_id = kv.get('page', 'LETTER').upper()
    dims = PAGE_SIZES.get(page_id, PAGE_SIZES['LETTER'])
    m_val = int(kv.get('margins', '72'))

    return {
        'meta': {
            'title': kv.get('title', ''),
            'description': kv.get('description', ''),
            'language': kv.get('language', 'es'),
        },
        'pageConfig': {
            'formatId': page_id,
            'width': dims['width'],
            'height': dims['height'],
            'margins': {'top': m_val, 'bottom': m_val, 'left': m_val, 'right': m_val},
        },
    }


# =============================================================================
# Roles Parsing
# =============================================================================

def parse_roles(lines):
    roles = []
    roles_map = {}

    for line in lines:
        line = line.strip()
        if not line:
            continue
        m = re.match(r'^(\w+)\s*:\s*(.+?)\s*\[order\s*:\s*(\d+)\]\s*$', line)
        if not m:
            continue
        ref = m.group(1)
        label = m.group(2).strip()
        order = int(m.group(3))
        role_id = make_id(ref)

        role = {
            'id': role_id,
            'label': label,
            'name': {'type': 'text', 'value': ''},
            'email': {'type': 'text', 'value': ''},
            'order': order,
        }
        roles.append(role)
        roles_map[ref] = role

    return roles, roles_map


# =============================================================================
# Workflow Parsing
# =============================================================================

def parse_workflow(lines):
    mode = 'sequential'
    for line in lines:
        line = line.strip()
        if line.startswith('mode:'):
            mode = line.split(':', 1)[1].strip()

    return {
        'orderMode': mode,
        'notifications': {
            'scope': 'global',
            'globalTriggers': {
                'on_document_created': {'enabled': False},
                'on_previous_roles_signed': {
                    'enabled': False,
                    'previousRolesConfig': {'mode': 'auto', 'selectedRoleIds': []},
                },
                'on_turn_to_sign': {'enabled': True},
                'on_all_signatures_complete': {'enabled': False},
            },
            'roleConfigs': [],
        },
    }


# =============================================================================
# Inline Parsing (marks + injectors)
# =============================================================================

# Regex that tokenises a line into mark delimiters, injector brackets, and text.
# Order matters: ** must be tried before standalone *.
_INLINE_TOKEN_RE = re.compile(
    r'(\*\*'           # bold toggle
    r'|(?<!\*)\*(?!\*)'  # italic toggle (standalone *)
    r'|__'             # underline toggle
    r'|\[[^\]]+\])'    # bracket group (potential injector)
)

_INJECTOR_RE = re.compile(
    r'^\[([^|\]]+)\|([^|\]]+?)(?:\|([^|\]]+))?\]$'
)


def _make_injector_node(var_id, label, var_type='TEXT'):
    return {
        'type': 'injector',
        'attrs': {
            'type': var_type,
            'label': label,
            'variableId': var_id,
            'format': None,
            'required': False,
            'prefix': None,
            'suffix': None,
            'showLabelIfEmpty': False,
            'defaultValue': None,
            'width': None,
            'isRoleVariable': False,
            'roleId': None,
            'roleLabel': None,
            'propertyKey': None,
        },
    }


def parse_inline(raw_text):
    """Parse a line of text into a list of ProseMirror inline nodes
    (text nodes with marks + injector nodes)."""
    if not raw_text:
        return []

    tokens = _INLINE_TOKEN_RE.split(raw_text)
    nodes = []
    bold = False
    italic = False
    underline = False

    for tok in tokens:
        if not tok:
            continue

        # Mark toggles
        if tok == '**':
            bold = not bold
            continue
        if tok == '*':
            italic = not italic
            continue
        if tok == '__':
            underline = not underline
            continue

        # Possible injector
        inj = _INJECTOR_RE.match(tok)
        if inj:
            nodes.append(_make_injector_node(
                inj.group(1).strip(),
                inj.group(2).strip(),
                inj.group(3).strip() if inj.group(3) else 'TEXT',
            ))
            continue

        # Plain text — build marks list
        marks = []
        if bold:
            marks.append({'type': 'bold'})
        if italic:
            marks.append({'type': 'italic'})
        if underline:
            marks.append({'type': 'underline'})

        node = {'type': 'text', 'text': tok}
        if marks:
            node['marks'] = list(marks)   # copy
        nodes.append(node)

    return nodes


# =============================================================================
# Block-level Helpers
# =============================================================================

def _make_paragraph(text, align=None):
    nodes = parse_inline(text)
    para = {'type': 'paragraph'}
    if align:
        para['attrs'] = {'textAlign': align}
    if nodes:
        para['content'] = nodes
    return para


def _make_heading(text, level, align=None):
    nodes = parse_inline(text)
    h = {'type': 'heading', 'attrs': {'level': level}}
    if align:
        h['attrs']['textAlign'] = align
    if nodes:
        h['content'] = nodes
    return h


def _make_list_item(text):
    return {'type': 'listItem', 'content': [_make_paragraph(text)]}


def _split_table_cells(row_text):
    """Split a table row inner text (between outer pipes) into cell strings.
    Respects brackets so that | inside [...] is not treated as a delimiter."""
    cells = []
    current = []
    depth = 0

    for ch in row_text:
        if ch == '[':
            depth += 1
            current.append(ch)
        elif ch == ']':
            depth = max(0, depth - 1)
            current.append(ch)
        elif ch == '|' and depth == 0:
            cells.append(''.join(current).strip())
            current = []
        else:
            current.append(ch)

    # Last segment after final |
    tail = ''.join(current).strip()
    if tail:
        cells.append(tail)

    return cells


def _make_table_header_cell(text):
    """Create a tableHeader node with inline content (no paragraph wrapper)."""
    inline = parse_inline(text)
    cell = {'type': 'tableHeader'}
    if inline:
        cell['content'] = inline
    return cell


def _make_table_data_cell(text):
    """Create a tableCell node with inline content (no paragraph wrapper)."""
    inline = parse_inline(text)
    cell = {
        'type': 'tableCell',
        'attrs': {
            'colspan': 1,
            'rowspan': 1,
            'colwidth': None,
            'background': None,
        },
    }
    if inline:
        cell['content'] = inline
    return cell


def _parse_table_block(lines, start_index):
    """Parse consecutive table rows starting at start_index.
    First row → tableHeader cells, subsequent rows → tableCell cells.
    Returns (table_node, next_index)."""
    rows_data = []
    i = start_index

    while i < len(lines):
        m = _TABLE_ROW_RE.match(lines[i].strip())
        if not m:
            break
        rows_data.append(m.group(1))
        i += 1

    if not rows_data:
        return None, start_index

    table_rows = []

    # First row → header
    header_cells = _split_table_cells(rows_data[0])
    table_rows.append({
        'type': 'tableRow',
        'content': [_make_table_header_cell(c) for c in header_cells],
    })

    # Remaining rows → data
    for row_text in rows_data[1:]:
        data_cells = _split_table_cells(row_text)
        table_rows.append({
            'type': 'tableRow',
            'content': [_make_table_data_cell(c) for c in data_cells],
        })

    table_node = {
        'type': 'table',
        'attrs': {
            'headerFontFamily': None,
            'headerFontSize': None,
            'headerFontWeight': None,
            'headerTextColor': None,
            'headerTextAlign': None,
            'headerBackground': None,
            'bodyFontFamily': None,
            'bodyFontSize': None,
            'bodyFontWeight': None,
            'bodyTextColor': None,
            'bodyTextAlign': None,
        },
        'content': table_rows,
    }

    return table_node, i


# =============================================================================
# Content Parsing (block level)
# =============================================================================

_ALIGNMENT_PREFIXES = [
    ('@center ', 'center'),
    ('@right ', 'right'),
    ('@justify ', 'justify'),
]

_HEADING_RE = re.compile(r'^(#{1,3})\s+(.+)$')
_CHECKBOX_RE = re.compile(r'^@checkbox\((\w+)(?:,\s*(.+?))?\)\s+(.+)$')
_SIGNATURE_RE = re.compile(r'^@signature\(([^,]+),\s*(\w+)\)\s*$')
_OPTION_RE = re.compile(r'^\s+\|\s+')
_ORDERED_RE = re.compile(r'^\d+\.\s+(.+)$')
_TABLE_ROW_RE = re.compile(r'^\|(.+)\|\s*$')


def parse_content(lines, roles_map):
    """Convert content lines to a list of ProseMirror block nodes."""
    nodes = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # --- Detect alignment prefix ---
        align = None
        content_line = line
        for prefix, alignment in _ALIGNMENT_PREFIXES:
            if line.startswith(prefix):
                align = alignment
                content_line = line[len(prefix):]
                break

        stripped = content_line.strip()

        # --- Empty line → spacer paragraph ---
        if not stripped and not align:
            nodes.append({'type': 'paragraph'})
            i += 1
            continue

        # --- Horizontal rule ---
        if stripped == '---':
            nodes.append({'type': 'horizontalRule'})
            i += 1
            continue

        # --- Page break ---
        if stripped == '===':
            nodes.append({'type': 'pageBreak'})
            i += 1
            continue

        # --- Heading ---
        hm = _HEADING_RE.match(stripped)
        if hm:
            nodes.append(_make_heading(hm.group(2), len(hm.group(1)), align))
            i += 1
            continue

        # --- Checkbox (interactiveField) ---
        cm = _CHECKBOX_RE.match(stripped)
        if cm:
            role_ref = cm.group(1)
            _params = cm.group(2)  # reserved for future options
            label = cm.group(3)

            role = roles_map.get(role_ref)
            role_id = role['id'] if role else make_id(role_ref)

            options = []
            i += 1
            while i < len(lines) and _OPTION_RE.match(lines[i]):
                opt_text = re.sub(r'^\s+\|\s+', '', lines[i]).strip()
                options.append({
                    'id': make_id(f"{label}:{opt_text}"),
                    'label': opt_text,
                })
                i += 1

            nodes.append({
                'type': 'interactiveField',
                'attrs': {
                    'id': make_id(f"checkbox:{label}"),
                    'fieldType': 'checkbox',
                    'roleId': role_id,
                    'label': label,
                    'required': True,
                    'options': options,
                    'placeholder': '',
                    'maxLength': 0,
                    'optionsLayout': 'vertical',
                },
            })
            continue

        # --- Signature ---
        sm = _SIGNATURE_RE.match(stripped)
        if sm:
            layout = sm.group(1).strip()
            line_width = sm.group(2).strip()

            sig_items = []
            i += 1
            while i < len(lines) and _OPTION_RE.match(lines[i]):
                sig_line = re.sub(r'^\s+\|\s+', '', lines[i]).strip()
                sp = re.match(r'^(\w+)\s*:\s*(.+?)(?:\s*\|\s*(.+))?\s*$', sig_line)
                if sp:
                    sig_role_ref = sp.group(1)
                    sig_label = sp.group(2).strip()
                    sig_subtitle = sp.group(3).strip() if sp.group(3) else None

                    role = roles_map.get(sig_role_ref)
                    sig_role_id = role['id'] if role else make_id(sig_role_ref)

                    item = {
                        'id': make_id(f"sig:{sig_role_ref}:{sig_label}"),
                        'roleId': sig_role_id,
                        'label': sig_label,
                        'imageOpacity': 100,
                    }
                    if sig_subtitle:
                        item['subtitle'] = sig_subtitle
                    sig_items.append(item)
                i += 1

            nodes.append({
                'type': 'signature',
                'attrs': {
                    'count': len(sig_items),
                    'layout': layout,
                    'lineWidth': line_width,
                    'signatures': sig_items,
                },
            })
            continue

        # --- Table ---
        if _TABLE_ROW_RE.match(stripped):
            table_node, i = _parse_table_block(lines, i)
            if table_node:
                nodes.append(table_node)
            continue

        # --- Bullet list ---
        if stripped.startswith('- '):
            items = []
            while i < len(lines) and lines[i].strip().startswith('- '):
                items.append(_make_list_item(lines[i].strip()[2:]))
                i += 1
            nodes.append({'type': 'bulletList', 'content': items})
            continue

        # --- Ordered list ---
        om = _ORDERED_RE.match(stripped)
        if om:
            items = []
            while i < len(lines):
                om2 = _ORDERED_RE.match(lines[i].strip())
                if not om2:
                    break
                items.append(_make_list_item(om2.group(1)))
                i += 1
            nodes.append({'type': 'orderedList', 'content': items})
            continue

        # --- Regular paragraph ---
        nodes.append(_make_paragraph(stripped, align))
        i += 1

    return nodes


# =============================================================================
# Variable ID Collection
# =============================================================================

def collect_variable_ids(content_nodes):
    """Recursively extract unique variable IDs from all injector nodes."""
    ids = set()

    def traverse(nodes):
        for node in nodes:
            if node.get('type') == 'injector':
                vid = (node.get('attrs') or {}).get('variableId')
                if vid:
                    ids.add(vid)
            children = node.get('content')
            if children:
                traverse(children)
            # Check inside interactiveField / signature attrs for nested structures
            attrs = node.get('attrs') or {}
            for sig in (attrs.get('signatures') or []):
                pass  # signatures don't carry variable refs

    traverse(content_nodes)
    return sorted(ids)


# =============================================================================
# Assembly
# =============================================================================

def convert_docml(input_path, output_path=None):
    """Read a .docml file and produce a PortableDocument JSON."""
    with open(input_path, 'r', encoding='utf-8') as f:
        text = f.read()

    sections = split_sections(text)

    if 'meta' not in sections:
        raise ValueError("Falta la seccion ---meta---")
    if 'content' not in sections:
        raise ValueError("Falta la seccion ---content---")

    meta_info = parse_meta(sections['meta'])
    roles, roles_map = parse_roles(sections.get('roles', []))
    workflow = parse_workflow(sections.get('workflow', []))
    content_nodes = parse_content(sections['content'], roles_map)
    variable_ids = collect_variable_ids(content_nodes)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")

    document = {
        'version': VERSION,
        'meta': meta_info['meta'],
        'pageConfig': meta_info['pageConfig'],
        'variableIds': variable_ids,
        'signerRoles': roles,
        'signingWorkflow': workflow,
        'content': {
            'type': 'doc',
            'content': content_nodes,
        },
        'exportInfo': {
            'exportedAt': now,
            'sourceApp': SOURCE_APP,
        },
    }

    if output_path is None:
        base = os.path.splitext(input_path)[0]
        output_path = base + '.json'

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(document, f, ensure_ascii=False, indent=2)

    print(f"  {os.path.basename(input_path)} -> {os.path.basename(output_path)}")
    print(f"  variables={len(variable_ids)}  roles={len(roles)}  nodes={len(content_nodes)}")

    return document


# =============================================================================
# CLI
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='Convierte archivos .docml a PortableDocument JSON (v1.1.0)')
    parser.add_argument('inputs', nargs='+', help='Archivos .docml a convertir')
    parser.add_argument('-o', '--output', help='Archivo de salida (solo para un input)')
    args = parser.parse_args()

    if args.output and len(args.inputs) > 1:
        print("Error: -o/--output solo funciona con un unico archivo de entrada", file=sys.stderr)
        sys.exit(1)

    errors = 0
    for path in args.inputs:
        try:
            convert_docml(path, args.output)
        except Exception as e:
            print(f"  Error en {path}: {e}", file=sys.stderr)
            errors += 1

    if errors:
        sys.exit(1)


if __name__ == '__main__':
    main()
