export type VariableType = 'text' | 'number' | 'date' | 'currency' | 'boolean'

export interface Variable {
  id: string
  name: string
  label: string
  type: VariableType
  defaultValue?: string
}

export interface SignerRole {
  id: string
  name: string
  type: 'sender' | 'recipient'
  email?: string
}

export interface EditorState {
  templateId: string
  versionId: string
  content: string
  isDirty: boolean
  lastSaved?: Date
  autoSaveEnabled: boolean
}

export interface PageFormat {
  name: string
  width: number
  height: number
  padding: {
    top: number
    right: number
    bottom: number
    left: number
  }
}
