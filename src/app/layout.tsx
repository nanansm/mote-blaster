import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from 'sonner'
import { Providers } from './providers'
import Script from 'next/script'
import './globals.css'

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
})

export const metadata: Metadata = {
  title: 'Mote Blaster — Kirim Pesan WhatsApp Massal Otomatis',
  description: 'Platform WhatsApp blast profesional untuk bisnis Indonesia. Kirim pesan ke ribuan kontak otomatis, import dari CSV & Google Sheets, pantau progres real-time. Gratis 50 pesan/hari.',
  keywords: [
    'whatsapp blast',
    'wa blast',
    'whatsapp blast gratis',
    'kirim pesan whatsapp massal',
    'whatsapp marketing',
    'wa sender',
    'broadcast whatsapp',
    'whatsapp bulk sender',
    'aplikasi wa blast',
    'tools whatsapp blast',
    'whatsapp blast indonesia',
    'kirim wa massal',
    'wa blast gratis',
    'whatsapp blaster',
    'blast wa otomatis',
    'whatsapp blast tool indonesia',
    'pesan massal whatsapp',
    'wa marketing tool',
    'whatsapp blast anti blokir',
    'wa blast murah',
  ],
  openGraph: {
    title: 'Mote Blaster — Kirim Pesan WhatsApp Massal Otomatis',
    description: 'Kirim pesan ke ribuan kontak WhatsApp otomatis. Gratis 50 pesan/hari. Import dari CSV & Google Sheets.',
    url: 'https://blaster.motekreatif.com',
    siteName: 'Mote Blaster',
    type: 'website',
    locale: 'id_ID',
    images: [
      {
        url: 'https://blaster.motekreatif.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Mote Blaster — WhatsApp Blast Tool Indonesia',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mote Blaster — Kirim Pesan WhatsApp Massal Otomatis',
    description: 'Kirim pesan ke ribuan kontak WhatsApp otomatis. Gratis 50 pesan/hari.',
    images: ['https://blaster.motekreatif.com/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://blaster.motekreatif.com',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {pixelId && (
          <>
            <Script id="meta-pixel" strategy="afterInteractive">
              {`
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${pixelId}');
                fbq('track', 'PageView');
              `}
            </Script>
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: 'none' }}
                src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        )}
      </head>
      <body className={`${font.variable} ${font.className}`}>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  )
}