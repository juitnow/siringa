import tasks from '@juitnow/build'
import { build } from '@plugjs/plug'

export default build({
  ...tasks,

  extraLintDir: 'test-d',
})
