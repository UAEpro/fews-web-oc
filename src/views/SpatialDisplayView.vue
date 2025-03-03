<template>
  <Teleport to="#web-oc-sidebar-target">
    <v-toolbar v-if="!mobile" density="compact">
      <v-btn-toggle rounded="0" v-model="menuType">
        <v-btn variant="text" value="treemenu">
          <v-icon>mdi-file-tree</v-icon>
        </v-btn>
        <v-btn variant="text" value="columnmenu">
          <v-icon>mdi-view-week</v-icon>
        </v-btn>
      </v-btn-toggle>
    </v-toolbar>
    <TreeMenu
      v-if="menuType === 'treemenu' && !mobile"
      v-model:active="active"
      :items="items"
      :open="open"
    >
    </TreeMenu>
    <ColumnMenu
      v-else-if="menuType === 'columnmenu' || mobile"
      v-model:active="active"
      :items="items"
      :open="open"
    >
    </ColumnMenu>
  </Teleport>
  <SpatialDisplay :layer-name="props.layerName"></SpatialDisplay>
</template>

<script setup lang="ts">
import ColumnMenu from '../components/general/ColumnMenu.vue'
import TreeMenu from '@/components/general/TreeMenu.vue'
import { ref, watch } from 'vue'
import { ColumnItem } from '../components/general/ColumnItem'
import { useWmsCapilities } from '@/services/useWms'
import { configManager } from '@/services/application-config'
import { Layer, LayerGroup } from '@deltares/fews-wms-requests'
import SpatialDisplay from '@/components/spatialdisplay/SpatialDisplay.vue'
import { useDisplay } from 'vuetify'

interface Props {
  layerName?: string
}

const props = withDefaults(defineProps<Props>(), {
  layerName: '',
})

const baseUrl = configManager.get('VITE_FEWS_WEBSERVICES_URL')
const capabilities = useWmsCapilities(baseUrl)

const active = ref<string[]>(['root'])
const open = ref<string[]>([])
const items = ref<ColumnItem[]>()
const menuType = ref('treemenu')

const { mobile } = useDisplay()

watch(capabilities, () => {
  if (capabilities.value === undefined) return []
  const layers = capabilities.value?.layers
  const groups = capabilities.value?.groups

  if (layers === undefined) return []
  if (groups === undefined) return []
  items.value = fillMenuItems(layers, groups)
})

function fillMenuItems(layers: Layer[], groups: LayerGroup[]): ColumnItem[] {
  let groupNodesMenuItemsMap = determineGroupNodesMap(groups)
  const newItems = buildMenuFromGroups(groups, groupNodesMenuItemsMap)
  attachLayersToMenu(layers, groupNodesMenuItemsMap)
  return newItems
}

function buildMenuFromGroups(
  groups: LayerGroup[],
  groupNodes: Map<string, ColumnItem>,
): ColumnItem[] {
  const items: ColumnItem[] = []
  for (const group of groups) {
    const groupNode = groupNodes.get(group.path.toString())
    if (group.groupName === undefined && groupNode !== undefined) {
      items.push(groupNode)
    } else {
      if (
        groupNode !== undefined &&
        group.groupName !== undefined &&
        group.path.length > 0
      ) {
        const parentPath = group.path.slice(0, -1)
        if (parentPath !== undefined) {
          const parentNode = groupNodes.get(parentPath.toString())
          parentNode?.children?.push(groupNode)
        }
      }
    }
  }
  return items
}

function determineGroupNodesMap(groups: LayerGroup[]): Map<string, ColumnItem> {
  let groupNodes = new Map<string, ColumnItem>()
  for (const group of groups) {
    const item: ColumnItem = {
      id: group.path.toString(),
      name: group.title,
      children: [],
    }
    groupNodes.set(group.path.toString(), item)
  }
  return groupNodes
}

function attachLayersToMenu(
  layers: Layer[],
  groupNodes: Map<string, ColumnItem>,
) {
  for (const layer of layers) {
    const groupNode = groupNodes.get(layer.path.toString())
    const item: ColumnItem = {
      id: layer.name,
      name: layer.title || layer.name,
      to: {
        name: 'SpatialDisplay',
        params: {
          layerName: layer.name,
        },
      },
    }
    groupNode?.children?.push(item)
  }
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}
</style>
