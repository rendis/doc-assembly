export interface DocumentHeaderSnapshot {
  imageUrl?: string | null
  content?: Record<string, unknown> | null
}

function hasTextOrStructuralContent(node: unknown): boolean {
  if (!node || typeof node !== 'object') {
    return false
  }

  const proseNode = node as {
    type?: string
    text?: string
    content?: unknown[]
  }

  if (typeof proseNode.text === 'string' && proseNode.text.trim().length > 0) {
    return true
  }

  if (proseNode.type === 'horizontalRule') {
    return true
  }

  if (!Array.isArray(proseNode.content)) {
    return false
  }

  return proseNode.content.some(hasTextOrStructuralContent)
}

export function hasHeaderImage(imageUrl?: string | null): boolean {
  return typeof imageUrl === 'string' && imageUrl.trim().length > 0
}

export function hasMeaningfulHeaderContent(
  content?: Record<string, unknown> | null
): boolean {
  return hasTextOrStructuralContent(content)
}

export function deriveHeaderEnabled(snapshot: DocumentHeaderSnapshot): boolean {
  return hasHeaderImage(snapshot.imageUrl) || hasMeaningfulHeaderContent(snapshot.content)
}
