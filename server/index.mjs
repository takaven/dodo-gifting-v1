import { createServer } from 'node:http'
import { createApp } from './app.mjs'

const port = Number(process.env.PORT || 5000)
const server = createServer(createApp())

server.listen(port, () => {
  console.log(`Dodo gifting server listening on http://localhost:${port}`)
})
