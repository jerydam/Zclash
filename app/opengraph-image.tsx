import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'ZClash — 1v1 quiz duels powered by Zcash'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/jpeg'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#07090f',
          backgroundImage:
            'radial-gradient(ellipse at 50% 0%, rgba(244,183,40,0.18) 0%, transparent 60%),' +
            'radial-gradient(circle at 10% 90%, rgba(244,183,40,0.08) 0%, transparent 40%)',
        }}
      >
        {/* Grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(244,183,40,0.04) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(244,183,40,0.04) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Gold glow orb */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '700px',
            height: '400px',
            background: 'radial-gradient(ellipse, rgba(244,183,40,0.20) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* ZEC coin badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #F4B728, #d99f1a)',
            border: '3px solid rgba(244,183,40,0.4)',
            boxShadow: '0 0 40px rgba(244,183,40,0.4)',
            marginBottom: '24px',
            fontSize: '40px',
            zIndex: 10,
          }}
        >
          ⚡
        </div>

        {/* Main title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            zIndex: 10,
          }}
        >
          <span
            style={{
              fontSize: '88px',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #F4B728 0%, #ffd96a 50%, #d99f1a 100%)',
              backgroundClip: 'text',
              color: 'transparent',
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            ZClash
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: '20px',
            fontSize: '30px',
            fontWeight: 500,
            color: 'rgba(250,248,240,0.75)',
            letterSpacing: '0.01em',
            zIndex: 10,
            textAlign: 'center',
          }}
        >
          1v1 Quiz Duels · Stake ZEC · Winner Takes All
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginTop: '44px',
            zIndex: 10,
          }}
        >
          {['⚔️  Duel', '🧠  Quiz', '🏆  Earn ZEC'].map((label) => (
            <div
              key={label}
              style={{
                padding: '10px 24px',
                backgroundColor: 'rgba(244,183,40,0.10)',
                border: '1px solid rgba(244,183,40,0.25)',
                borderRadius: '50px',
                fontSize: '20px',
                fontWeight: 600,
                color: '#F4B728',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Bottom domain */}
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            fontSize: '18px',
            color: 'rgba(250,248,240,0.3)',
            letterSpacing: '0.08em',
            zIndex: 10,
          }}
        >
          app.zclash.io
        </div>
      </div>
    ),
    { ...size }
  )
}
