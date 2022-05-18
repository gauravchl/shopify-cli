import {updateURLs, generateURL} from './urls'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {api, path, plugins} from '@shopify/cli-kit'
import {outputMocker} from '@shopify/cli-testing'
import {App, UIExtension, WebType} from '$cli/models/app/app'

const LOCAL_APP: App = {
  directory: '',
  packageManager: 'yarn',
  configurationPath: '/shopify.app.toml',
  configuration: {name: 'my-app', scopes: 'read_products'},
  webs: [
    {
      directory: '',
      configuration: {
        type: WebType.Backend,
        commands: {dev: ''},
      },
    },
  ],
  extensions: {ui: [], theme: [], function: []},
}

beforeEach(() => {
  vi.mock('$cli/prompts/dev')
  vi.mock('@shopify/cli-kit', async () => {
    const cliKit: any = await vi.importActual('@shopify/cli-kit')
    return {
      ...cliKit,
      session: {
        ensureAuthenticatedPartners: async () => 'token',
      },
      api: {
        partners: {
          request: vi.fn(),
        },
        graphql: cliKit.api.graphql,
      },
      plugins: {
        lookupTunnelPlugin: vi.fn(),
      },
    }
  })
})

describe('generateURL', () => {
  it('returns a localhost URL by default', async () => {
    // Given
    const input = {
      appManifest: LOCAL_APP,
      reset: false,
      tunnel: false,
      update: false,
      plugins: [],
    }

    // When
    const got = await generateURL(input, 3456)

    // Then
    expect(got).toEqual('http://localhost:3456')
  })

  it('shows an error if the --tunnel flag is passed, but the plugin is not found', async () => {
    // Given
    const input = {
      appManifest: LOCAL_APP,
      reset: false,
      tunnel: true,
      update: false,
      plugins: [],
    }
    vi.mocked(plugins.lookupTunnelPlugin).mockImplementationOnce(async () => undefined)

    // When
    const got = generateURL(input, 3456)

    // Then
    await expect(got).rejects.toThrow('The tunnel plugin could not be found.')
  })

  it('returns a tunnel URL when the --tunnel flag is passed', async () => {
    // Given
    const input = {
      appManifest: LOCAL_APP,
      reset: false,
      tunnel: true,
      update: false,
      plugins: [],
    }
    vi.mocked(plugins.lookupTunnelPlugin).mockImplementationOnce(async () => {
      return {start: async () => 'https://fake-url.ngrok.io'}
    })

    // When
    const got = await generateURL(input, 3456)

    // Then
    expect(got).toEqual('https://fake-url.ngrok.io')
  })

  it('returns a tunnel URL when there is at least one extension', async () => {
    // Given
    const appRoot = '/'
    const extensionName = 'myextension'
    const extensionRoot = `/extensions/${extensionName}`
    const extension: UIExtension = {
      buildDirectory: `${extensionRoot}/build`,
      configurationPath: path.join(appRoot, 'shopify.app.toml'),
      configuration: {
        name: extensionName,
        metafields: [],
        type: 'checkout_post_purchase',
      },
      directory: extensionRoot,
      entrySourceFilePath: `${extensionRoot}/src/index.js`,
    }
    const appWithExtension = {...LOCAL_APP, extensions: {ui: [extension]}}

    const input = {
      appManifest: appWithExtension,
      reset: false,
      tunnel: false,
      update: false,
      plugins: [],
    }
    vi.mocked(plugins.lookupTunnelPlugin).mockImplementationOnce(async () => {
      return {start: async () => 'https://fake-url.ngrok.io'}
    })

    // When
    const got = await generateURL(input, 3456)

    // Then
    expect(got).toEqual('https://fake-url.ngrok.io')
  })
})

describe('updateURLs', () => {
  it('sends a request to update the URLs', async () => {
    // Given
    vi.mocked(api.partners.request).mockResolvedValueOnce({appUpdate: {userErrors: []}})
    const expectedVariables = {
      apiKey: 'apiKey',
      appUrl: 'http://localhost:3456',
      redir: [
        'http://localhost:3456/auth/callback',
        'http://localhost:3456/auth/shopify/callback',
        'http://localhost:3456/api/auth/callback',
      ],
    }

    // When
    await updateURLs('apiKey', 'http://localhost:3456')

    // Then
    expect(api.partners.request).toHaveBeenCalledWith(api.graphql.UpdateURLsQuery, 'token', expectedVariables)
  })

  it('notifies the user about the update', async () => {
    // Given
    vi.mocked(api.partners.request).mockResolvedValueOnce({appUpdate: {userErrors: []}})
    const outputMock = outputMocker.mockAndCapture()

    // When
    await updateURLs('apiKey', 'http://localhost:3456')

    // Then
    expect(outputMock.output()).toMatch('Allowed redirection URLs updated in Partners Dashboard')
  })

  it('throws an error if requests has a user error', async () => {
    // Given
    vi.mocked(api.partners.request).mockResolvedValueOnce({appUpdate: {userErrors: [{message: 'Boom!'}]}})

    // When
    const got = updateURLs('apiKey', 'http://localhost:3456')

    // Then
    expect(got).rejects.toThrow(`Boom!`)
  })
})
