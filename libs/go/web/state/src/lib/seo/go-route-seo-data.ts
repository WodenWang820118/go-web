import { Data } from '@angular/router';

export const GO_SITE_ORIGIN = 'https://gxgo.synology.me';
export const GO_SOCIAL_IMAGE_PATH = '/social/gxgo-og.png';
export const GO_SOCIAL_IMAGE_URL = `${GO_SITE_ORIGIN}${GO_SOCIAL_IMAGE_PATH}`;

export type GoSeoPageKey = 'lobby' | 'setup' | 'room' | 'play';

export interface GoRouteSeoData {
  readonly page: GoSeoPageKey;
}

export const GO_ROUTE_SEO_DATA_KEY = 'goSeo';

export function goRouteSeoData(page: GoSeoPageKey): Data {
  return {
    [GO_ROUTE_SEO_DATA_KEY]: { page } satisfies GoRouteSeoData,
  };
}
