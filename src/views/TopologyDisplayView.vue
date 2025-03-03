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
  <Teleport to="#app-bar-content">
    <v-tabs v-model="activeTab" class="d-flex flex-shrink-0">
      <v-tab
        v-for="tab in displayTabs"
        :key="tab.id"
        :href="tab.href"
        :target="tab.target"
        :to="tab.to"
        class="text-capitalize"
      >
        <v-icon>{{ tab.icon }}</v-icon>
        {{ tab.title }}
      </v-tab>
    </v-tabs>
    <v-btn
      v-if="externalLink"
      :href="externalLink"
      target="_blank"
      variant="text"
      class="flex-0-0 align-self-center text-capitalize"
      ><v-icon>mdi-share</v-icon>Link</v-btn
    >
  </Teleport>
  <router-view v-slot="{ Component }">
    <keep-alive include="SpatialDisplay">
      <component :is="Component" />
    </keep-alive>
  </router-view>
</template>

<script setup lang="ts">
import type { ColumnItem } from '@/components/general/ColumnItem'
import ColumnMenu from '@/components/general/ColumnMenu.vue'
import TreeMenu from '@/components/general/TreeMenu.vue'
import { createTopologyMap, getTopologyNodes } from '@/lib/topology'
import router from '@/router'
import type { TopologyNode } from '@deltares/fews-pi-requests'
import { watchEffect } from 'vue'
import { ref, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { useDisplay } from 'vuetify'

const WEB_BROWSER_DISPLAY: string = 'web browser display'

interface Props {
  nodeId?: string
  layerName?: string
}

interface DisplayTab {
  id: string
  title: string
  href?: string
  target?: string
  to?: RouteLocationRaw
  icon: string
}

const props = withDefaults(defineProps<Props>(), {
  nodeId: '',
})

const active = ref<string[]>([])
const open = ref<string[]>([])
const items = ref<ColumnItem[]>([])
const menuType = ref('treemenu')

const activeTab = ref(0)
const displayTabs = ref<DisplayTab[]>([])
const externalLink = ref<string>('')

const { mobile } = useDisplay()

watch(
  () => props.nodeId,
  () => {
    if (active.value[0] !== props.nodeId) {
      active.value = [props.nodeId]
    }
  },
  { immediate: true },
)

const nodes = ref<TopologyNode[]>()
const topologyMap = ref(new Map<string, TopologyNode>())
getTopologyNodes().then((response) => {
  nodes.value = response
  topologyMap.value = createTopologyMap(nodes.value)
})

function topologyNodeIsVisible(node: TopologyNode): boolean {
  if (node.url !== undefined) return true
  if (node.filterIds !== undefined && node.filterIds.length > 0) return true
  if (node.gridDisplaySelection !== undefined) return true
  if (node.displayId !== undefined) return true
  if (node.displayGroups !== undefined && node.displayGroups.length > 0)
    return true
  if (node.topologyNodes === undefined) return false
  return node.topologyNodes.some(topologyNodeIsVisible)
}

function recursiveUpdateNode(nodes: TopologyNode[]) {
  return nodes
    .filter((node) => topologyNodeIsVisible(node))
    .map((node) => {
      const result: ColumnItem = {
        id: node.id,
        name: node.name,
        icon: getIcon(node),
        href: getUrl(node),
        to: {
          name: 'TopologyDisplay',
          params: {
            nodeId: node.id,
          },
        },
      }
      if (node.topologyNodes) {
        result.children = recursiveUpdateNode(node.topologyNodes)
      }
      return result
    })
}

function getIcon(node: TopologyNode): string | undefined {
  if (node.url && !node.topologyNodes && !node.displayGroups) return 'mdi-share'
  return undefined
}

function getUrl(node: TopologyNode): string | undefined {
  if (node.url && !node.topologyNodes && !node.displayGroups) return node.url
  return undefined
}

function updateItems(): void {
  if (nodes.value) {
    items.value = recursiveUpdateNode(nodes.value)
  }
}

watch(nodes, updateItems)

// Update the displayTabs if the active node changes (or if the topologyMap changes).
// Redirect to the corresponding display of the updated active tab.
watchEffect(() => {
  // Check if the current displayTab already matches the active node.
  const activeNodeId = active.value[0]
  const timeseriesTabId = `${activeNodeId}-timeseries`
  const spatialTabId = `${activeNodeId}-spatial`
  const urlTabId = `${activeNodeId}-${WEB_BROWSER_DISPLAY}`
  if (
    displayTabs.value[activeTab.value] &&
    (displayTabs.value[activeTab.value].id === timeseriesTabId ||
      displayTabs.value[activeTab.value].id === spatialTabId ||
      displayTabs.value[activeTab.value].id === urlTabId)
  )
    return

  // Check if the active node is a leaf.
  const node = topologyMap.value.get(active.value[0])
  if (node === undefined || node.topologyNodes) return

  // Create the displayTabs for the active node.
  const _displayTabs: DisplayTab[] = []
  if (node.gridDisplaySelection !== undefined) {
    _displayTabs.push({
      id: spatialTabId,
      title: 'Map',
      to: {
        name: 'TopologySpatialDisplay',
        params: {
          nodeId: node.id,
          layerName: node.gridDisplaySelection?.plotId,
        },
      },
      icon: 'mdi-map',
    })
  }
  if (node.displayGroups !== undefined || node.displayId !== undefined) {
    _displayTabs.push({
      id: timeseriesTabId,
      title: 'Charts',
      to: {
        name: 'TopologyTimeSeries',
        params: {
          nodeId: node.id,
        },
      },
      icon: 'mdi-chart-multiple',
    })
  }
  if (node.url !== undefined) {
    externalLink.value = node.url
  }
  displayTabs.value = _displayTabs

  // Redirect to the first displayTab.
  activeTab.value = 0
  if (_displayTabs.length > 0 && _displayTabs[0].to !== undefined) {
    router.push(_displayTabs[0].to)
  } else {
    router.push({ name: 'TopologyDisplay', params: { nodeId: node.id } })
  }
})
</script>
