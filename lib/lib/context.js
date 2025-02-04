import { SET_PAGE_DATA } from '~typo3/store/mutation-types'
import { isDynamicRoute, redirect } from '~typo3/lib/route'
import { getFrontendLayout } from '~typo3/lib/layouts'

/**
 * Extend NuxtContext by TYPO3 API
 *
 * @param {Object} context -  NuxtContext
 * @param {Object} response - page response
 * @returns {Object} context
 */
async function setContext (context, response) {
  const { data } = response
  const { store, app } = context

  if (data) {
    const { appearance } = data
    if (appearance) {
      context.layout = getFrontendLayout(
        appearance.layout,
        context.app.$typo3.options.layouts
      )
    }

    context.t3page = data
    store.commit(SET_PAGE_DATA, data)

    await app.$typo3.callHook('context', context, data)
  }

  return context
}

/**
 * Extend NuxtContext by TYPO3 API
 *
 * @param {Object} context - NuxtContext
 * @param {Object} response - error page response
 * @returns {Object} context
 */
async function setErrorContext (context, response) {
  const { error } = context
  const errorContext = {
    ssr: null,
    message: response.message,
    statusCode: response.status
  }

  if (response.data) {
    const { layout, t3page } = await setContext(
      context,
      response
    )

    errorContext.ssr = {
      layout,
      t3page
    }
  }

  return error(errorContext)
}

/**
 * Context route middleware
 *
 * @param {Object} context -  NuxtContext
 *
 */
async function contextMiddleware (context) {
  const { route, app } = context
  const path = route.fullPath || route.path

  if (isDynamicRoute(context.route)) {
    try {
      const response = await app.$typo3.api.getPage(path)
      const { data } = response

      if (data && data.redirectUrl) {
        const { redirectUrl, statusCode } = data
        await app.$typo3.callHook('redirect', context, data)
        return redirect(context, redirectUrl, statusCode)
      }

      setContext(context, response)
    } catch (error) {
      setErrorContext(context, error.response)
    }
  }
  return context
}

export { setContext, setErrorContext, contextMiddleware }
