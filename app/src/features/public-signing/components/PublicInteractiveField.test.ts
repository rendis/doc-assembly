import { describe, expect, it } from 'vitest'

import { isPublicFieldOwned } from './PublicInteractiveField'

describe('isPublicFieldOwned', () => {
  it('enables field when roleId matches signerRoleId', () => {
    const owned = isPublicFieldOwned({
      roleId: 'role-a',
      signerRoleId: 'role-a',
      hasAllowedFieldAccess: false,
    })

    expect(owned).toBe(true)
  })

  it('enables field when backend allows fieldId despite role mismatch', () => {
    const owned = isPublicFieldOwned({
      roleId: 'role-a',
      signerRoleId: 'role-b',
      hasAllowedFieldAccess: true,
    })

    expect(owned).toBe(true)
  })

  it('keeps field disabled when neither role nor allowedFieldIds match', () => {
    const owned = isPublicFieldOwned({
      roleId: 'role-a',
      signerRoleId: 'role-b',
      hasAllowedFieldAccess: false,
    })

    expect(owned).toBe(false)
  })
})
