import React from 'react'
import { render } from '@gpuix/react'
import { ChatApp } from './app'

// A browser preview has no process, daemon, OS chrome or native drag path.
render(<ChatApp turnCount={0} engine={false} />, {
  title: 'Hiroshi · Browser preview',
  width: window.innerWidth,
  height: window.innerHeight,
  titlebarTransparent: true,
})
