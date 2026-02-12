import * as React from 'react'

function ViIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={32}
      height={24}
      viewBox='0 0 32 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <mask
        id='a'
        style={{
          maskType: 'luminance'
        }}
        maskUnits='userSpaceOnUse'
        x={0}
        y={0}
        width={32}
        height={24}
      >
        <path fill='#fff' d='M0 0H32V24H0z' />
      </mask>
      <g mask='url(#a)'>
        <path fillRule='evenodd' clipRule='evenodd' d='M0 0h32v24H0V0z' fill='#F7FCFF' />
        <path fillRule='evenodd' clipRule='evenodd' d='M0 0v24h32V0H0z' fill='#E31D1C' />
        <mask
          id='b'
          style={{
            maskType: 'luminance'
          }}
          maskUnits='userSpaceOnUse'
          x={0}
          y={0}
          width={32}
          height={24}
        >
          <path fillRule='evenodd' clipRule='evenodd' d='M0 0v24h32V0H0z' fill='#fff' />
        </mask>
        <g mask='url(#b)'>
          <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M16.062 15.98l-5.15 3.275 1.727-5.733-3.674-3.746 5.065-.11 2.241-5.66 2.042 5.734 5.053.089-3.797 3.814 1.773 5.454-5.28-3.117z'
            fill='#FFD221'
          />
        </g>
      </g>
    </svg>
  )
}

export default ViIcon
