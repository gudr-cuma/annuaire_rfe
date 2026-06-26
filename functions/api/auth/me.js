import { json, methodNotAllowed } from '../../_lib/responses.js'

export async function onRequest(context) {
  const { request } = context
  if (request.method !== 'GET') return methodNotAllowed()

  const { user, userDepartments } = context.data
  return json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    departments: userDepartments,
  })
}
