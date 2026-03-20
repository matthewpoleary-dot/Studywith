import posthog from 'posthog-js'

export const initPostHog = () => {
  if (typeof window !== 'undefined' && !posthog.__loaded) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: false, // handled manually for accuracy
      capture_pageleave: true,
      session_recording: {
        maskAllInputs: true, // privacy: don't record what users type
        maskInputOptions: { password: true },
      },
      persistence: 'localStorage',
    })
  }
  return posthog
}

export { posthog }
