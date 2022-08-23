import tasks from '@juitnow/build'
import { build, find } from '@plugjs/plug'

export default build({
  ...tasks,

  async find_extra() {
    return find('**/*.ts', { directory: 'test-d' })
  },
})
