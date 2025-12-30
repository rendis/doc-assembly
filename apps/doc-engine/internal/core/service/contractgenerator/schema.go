package contractgenerator

import "encoding/json"

// PortableDocumentSchema returns the JSON Schema for the PortableDocument format.
// This schema is used for structured output validation in LLM requests.
func PortableDocumentSchema() json.RawMessage {
	return json.RawMessage(portableDocSchemaJSON)
}

// portableDocSchemaJSON is the JSON Schema definition for PortableDocument.
// This schema enables LLM structured output to match the expected format.
const portableDocSchemaJSON = `{
  "type": "object",
  "properties": {
    "version": {
      "type": "string",
      "description": "Format version, always '1.1.0'"
    },
    "meta": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "description": { "type": "string" },
        "language": { "type": "string", "enum": ["en", "es"] },
        "customFields": {
          "type": "object",
          "additionalProperties": { "type": "string" }
        }
      },
      "required": ["title", "language"],
      "additionalProperties": false
    },
    "pageConfig": {
      "type": "object",
      "properties": {
        "formatId": { "type": "string", "enum": ["A4", "LETTER", "LEGAL", "CUSTOM"] },
        "width": { "type": "number" },
        "height": { "type": "number" },
        "margins": {
          "type": "object",
          "properties": {
            "top": { "type": "number" },
            "bottom": { "type": "number" },
            "left": { "type": "number" },
            "right": { "type": "number" }
          },
          "required": ["top", "bottom", "left", "right"],
          "additionalProperties": false
        },
        "showPageNumbers": { "type": "boolean" },
        "pageGap": { "type": "number" }
      },
      "required": ["formatId", "width", "height", "margins", "showPageNumbers", "pageGap"],
      "additionalProperties": false
    },
    "variableIds": {
      "type": "array",
      "items": { "type": "string" }
    },
    "signerRoles": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "label": { "type": "string" },
          "name": {
            "type": "object",
            "properties": {
              "type": { "type": "string", "enum": ["text", "injectable"] },
              "value": { "type": "string" }
            },
            "required": ["type", "value"],
            "additionalProperties": false
          },
          "email": {
            "type": "object",
            "properties": {
              "type": { "type": "string", "enum": ["text", "injectable"] },
              "value": { "type": "string" }
            },
            "required": ["type", "value"],
            "additionalProperties": false
          },
          "order": { "type": "number" }
        },
        "required": ["id", "label", "name", "email", "order"],
        "additionalProperties": false
      }
    },
    "signingWorkflow": {
      "type": "object",
      "properties": {
        "orderMode": { "type": "string", "enum": ["parallel", "sequential"] },
        "notifications": {
          "type": "object",
          "properties": {
            "scope": { "type": "string", "enum": ["global", "individual"] },
            "globalTriggers": {
              "type": "object",
              "additionalProperties": {
                "type": "object",
                "properties": {
                  "enabled": { "type": "boolean" },
                  "previousRolesConfig": {
                    "type": "object",
                    "properties": {
                      "mode": { "type": "string", "enum": ["auto", "custom"] },
                      "selectedRoleIds": {
                        "type": "array",
                        "items": { "type": "string" }
                      }
                    },
                    "additionalProperties": false
                  }
                },
                "required": ["enabled"],
                "additionalProperties": false
              }
            },
            "roleConfigs": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "roleId": { "type": "string" },
                  "triggers": {
                    "type": "object",
                    "additionalProperties": {
                      "type": "object",
                      "properties": {
                        "enabled": { "type": "boolean" },
                        "previousRolesConfig": {
                          "type": "object",
                          "properties": {
                            "mode": { "type": "string", "enum": ["auto", "custom"] },
                            "selectedRoleIds": {
                              "type": "array",
                              "items": { "type": "string" }
                            }
                          },
                          "additionalProperties": false
                        }
                      },
                      "required": ["enabled"],
                      "additionalProperties": false
                    }
                  }
                },
                "required": ["roleId", "triggers"],
                "additionalProperties": false
              }
            }
          },
          "required": ["scope", "globalTriggers", "roleConfigs"],
          "additionalProperties": false
        }
      },
      "required": ["orderMode", "notifications"],
      "additionalProperties": false
    },
    "content": {
      "type": "object",
      "properties": {
        "type": { "type": "string", "const": "doc" },
        "content": {
          "type": "array",
          "items": { "$ref": "#/$defs/node" }
        }
      },
      "required": ["type", "content"],
      "additionalProperties": false
    },
    "exportInfo": {
      "type": "object",
      "properties": {
        "exportedAt": { "type": "string" },
        "exportedBy": { "type": "string" },
        "sourceApp": { "type": "string" },
        "checksum": { "type": "string" }
      },
      "required": ["exportedAt", "sourceApp"],
      "additionalProperties": false
    }
  },
  "required": ["version", "meta", "pageConfig", "variableIds", "signerRoles", "signingWorkflow", "content", "exportInfo"],
  "additionalProperties": false,
  "$defs": {
    "node": {
      "type": "object",
      "properties": {
        "type": { "type": "string" },
        "attrs": { "type": "object" },
        "content": {
          "type": "array",
          "items": { "$ref": "#/$defs/node" }
        },
        "marks": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "type": { "type": "string" },
              "attrs": { "type": "object" }
            },
            "required": ["type"]
          }
        },
        "text": { "type": "string" }
      },
      "required": ["type"]
    }
  }
}`
