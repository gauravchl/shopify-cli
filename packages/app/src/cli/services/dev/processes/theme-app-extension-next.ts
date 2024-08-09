import {BaseProcess, DevProcessFunction} from './types.js'
import {ExtensionInstance} from '../../../models/extensions/extension-instance.js'
import {DeveloperPlatformClient} from '../../../utilities/developer-platform-client.js'
import {HostThemeManager} from '../../../utilities/host-theme-manager.js'
import {outputInfo} from '@shopify/cli-kit/node/output'
import {AdminSession, ensureAuthenticatedAdmin} from '@shopify/cli-kit/node/session'
import {fetchTheme} from '@shopify/cli-kit/node/themes/api'
import {AbortError} from '@shopify/cli-kit/node/error'
import {Theme} from '@shopify/cli-kit/node/themes/types'

interface PreviewThemeAppExtensionsOptions {
  adminSession: AdminSession
  developerPlatformClient: DeveloperPlatformClient
  themeId?: string
  themeExtensionPort?: number
}

export interface PreviewThemeAppExtensionsProcess extends BaseProcess<PreviewThemeAppExtensionsOptions> {
  type: 'theme-app-extensions'
}

const runThemeAppExtensionsServerNext: DevProcessFunction<PreviewThemeAppExtensionsOptions> = async (
  {stdout: _stdout, stderr: _stderr, abortSignal: _abortSignal},
  {
    adminSession: _adminSession,
    developerPlatformClient: _developerPlatformClient,
    themeId: _themeId,
    themeExtensionPort: _themeExtensionPort,
  },
) => {
  await initializeFSWatcher()
  await startThemeAppExtensionDevelopmentServer()
}

export async function setupPreviewThemeAppExtensionsProcess({
  allExtensions,
  storeFqdn,
  theme,
  themeExtensionPort,
  developerPlatformClient,
}: Pick<PreviewThemeAppExtensionsOptions, 'developerPlatformClient'> & {
  allExtensions: ExtensionInstance[]
  storeFqdn: string
  theme?: string
  themeExtensionPort?: number
}): Promise<PreviewThemeAppExtensionsProcess | undefined> {
  outputInfo('This feature is currently in development and is not ready for use or testing yet.')

  const themeExtensions = allExtensions.filter((ext) => ext.isThemeExtension)
  if (themeExtensions.length === 0) {
    return
  }

  const adminSession = await ensureAuthenticatedAdmin(storeFqdn)

  const themeId = await findOrCreateHostTheme(adminSession, theme)

  return {
    type: 'theme-app-extensions',
    prefix: 'theme-extensions',
    function: runThemeAppExtensionsServerNext,
    options: {
      adminSession,
      developerPlatformClient,
      themeId,
      themeExtensionPort,
    },
  }
}

export async function findOrCreateHostTheme(adminSession: AdminSession, theme?: string): Promise<string> {
  let hostTheme: Theme | undefined
  if (theme) {
    hostTheme = await fetchTheme(parseInt(theme, 10), adminSession)
    if (!hostTheme) {
      throw new AbortError(`Could not find a theme on shop ${adminSession.storeFqdn} with id ${theme}`)
    }
  } else {
    const themeManager = new HostThemeManager(adminSession)
    hostTheme = await themeManager.findOrCreate()
  }
  return hostTheme.id.toString()
}

async function initializeFSWatcher() {}

async function startThemeAppExtensionDevelopmentServer() {}
