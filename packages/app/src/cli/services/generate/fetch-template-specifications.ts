import {
  RemoteTemplateSpecificationsQuery,
  RemoteTemplateSpecificationsQuerySchema,
} from '../../api/graphql/template_specifications.js'
import {ExtensionTemplate} from '../../models/app/template.js'
import themeExtension from '../../models/templates/theme-specifications/theme.js'
import checkoutPostPurchaseExtension from '../../models/templates/ui-specifications/checkout_post_purchase.js'
import checkoutUIExtension from '../../models/templates/ui-specifications/checkout_ui_extension.js'
import customerAccountsUIExtension from '../../models/templates/ui-specifications/customer_accounts_ui_extension.js'
import flowActionExtension from '../../models/templates/flow_action.js'
import flowTriggerExtension from '../../models/templates/flow_trigger.js'
import posUIExtension from '../../models/templates/ui-specifications/pos_ui_extension.js'
import productSubscriptionUIExtension from '../../models/templates/ui-specifications/product_subscription.js'
import taxCalculationUIExtension from '../../models/templates/ui-specifications/tax_calculation.js'
import UIExtension from '../../models/templates/ui-specifications/ui_extension.js'
import webPixelUIExtension from '../../models/templates/ui-specifications/web_pixel_extension.js'
import {partnersRequest} from '@shopify/cli-kit/node/api/partners'

export async function fetchExtensionTemplates(
  token: string,
  apiKey: string,
  availableSpecifications: string[],
): Promise<ExtensionTemplate[]> {
  const remoteTemplates: RemoteTemplateSpecificationsQuerySchema = await partnersRequest(
    RemoteTemplateSpecificationsQuery,
    token,
    {apiKey},
  )
  const remoteIDs = remoteTemplates.templateSpecifications.map((template) => template.identifier)
  // Filter out local templates that are already available remotely
  const lcoalTemplates = localExtensionTemplates().filter((template) => !remoteIDs.includes(template.identifier))
  const allTemplates = remoteTemplates.templateSpecifications.concat(lcoalTemplates)
  return allTemplates.filter(
    (template) =>
      availableSpecifications.includes(template.identifier) ||
      availableSpecifications.includes(template.types[0]!.type),
  )
}

export function localExtensionTemplates(): ExtensionTemplate[] {
  return [
    themeExtension,
    checkoutPostPurchaseExtension,
    checkoutUIExtension,
    customerAccountsUIExtension,
    posUIExtension,
    productSubscriptionUIExtension,
    taxCalculationUIExtension,
    UIExtension,
    webPixelUIExtension,
    flowTriggerExtension,
    flowActionExtension,
  ]
}
