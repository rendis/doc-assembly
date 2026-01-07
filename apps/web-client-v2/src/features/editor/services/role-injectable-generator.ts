/**
 * Generador de valores aleatorios para role injectables
 *
 * Utiliza @faker-js/faker para generar datos de prueba realistas
 * para nombres y emails de roles de firmantes.
 */

import { faker } from '@faker-js/faker'
import type { RolePropertyKey } from '../types/role-injectable'

/**
 * Genera un valor aleatorio según el tipo de propiedad de rol
 *
 * @param propertyKey - Tipo de propiedad ('name' o 'email')
 * @param context - Contexto opcional con nombre para generar email consistente
 * @returns Valor generado como string
 */
export function generateRoleValue(
  propertyKey: RolePropertyKey,
  context?: { firstName?: string; lastName?: string }
): string {
  switch (propertyKey) {
    case 'name':
      return faker.person.fullName()

    case 'email':
      if (context?.firstName || context?.lastName) {
        return faker.internet.email({
          firstName: context.firstName,
          lastName: context.lastName,
          provider: 'example.com',
        })
      }
      return faker.internet.email({ provider: 'example.com' })

    default:
      return ''
  }
}

/**
 * Genera valores consistentes para todas las propiedades de un rol
 * El email se genera basado en el nombre para mantener coherencia
 *
 * @returns Objeto con nombre completo y email relacionado
 */
export function generateConsistentRoleValues(): {
  name: string
  email: string
} {
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  const fullName = `${firstName} ${lastName}`

  return {
    name: fullName,
    email: faker.internet.email({
      firstName,
      lastName,
      provider: 'example.com',
    }),
  }
}

/**
 * Genera valores para todos los role injectables de un rol específico
 *
 * @param roleLabel - Label del rol (ej: "Cliente", "Vendedor")
 * @param propertyKeys - Array de propiedades a generar
 * @returns Record con variableId como key y valor generado
 */
export function generateRoleInjectableValues(
  roleLabel: string,
  propertyKeys: RolePropertyKey[]
): Record<string, string> {
  const values: Record<string, string> = {}
  const { name, email } = generateConsistentRoleValues()

  propertyKeys.forEach((key) => {
    const normalizedLabel = roleLabel.trim().replace(/\s+/g, '_')
    const variableId = `ROLE.${normalizedLabel}.${key}`
    values[variableId] = key === 'name' ? name : email
  })

  return values
}
