import {
  BoundingBox,
  GetCapabilitiesResponse,
  Layer,
  WMSProvider,
} from '@deltares/fews-wms-requests'
import { MaybeRefOrGetter, ref, Ref, toValue, watchEffect } from 'vue'
// @ts-ignore
import { toWgs84 } from '@turf/projection'
// @ts-ignore
import { point } from '@turf/helpers'
import { LngLatBounds } from 'mapbox-gl'
import { GetLegendGraphicResponse } from '@deltares/fews-wms-requests/src/response/getLegendGraphicResponse.ts'
import { createTransformRequestFn } from '@/lib/requests/transformRequest'
export interface UseWmsReturn {
  selectedLayer: Ref<Layer | undefined>
  legendGraphic: Ref<GetLegendGraphicResponse | undefined>
  times: Ref<Date[] | undefined>
}

export function useWmsLayer(
  baseUrl: string,
  layerName: MaybeRefOrGetter<string>,
  useDisplayUnits: MaybeRefOrGetter<boolean>,
): UseWmsReturn {
  const legendGraphic = ref<GetLegendGraphicResponse>()
  const wmsUrl = `${baseUrl}/wms`
  const wmsProvider = new WMSProvider(wmsUrl, {
    transformRequestFn: createTransformRequestFn(),
  })
  const times = ref<Date[]>()
  const selectedLayer = ref<Layer>()

  async function loadLayer(): Promise<void> {
    const _layers = toValue(layerName)
    if (_layers === '') return
    try {
      const capabilities = await wmsProvider.getCapabilities({
        layers: _layers,
        importFromExternalDataSource: false,
        onlyHeaders: false,
        forecastCount: 1,
      })
      if (capabilities.layers.length > 0) {
        selectedLayer.value =
          capabilities.layers.find((l) => l.name === _layers) ??
          capabilities.layers[0]
      }
    } catch (error) {
      console.error(error)
    }
  }

  function loadTimes(): void {
    let valueDates: Date[] = []
    if (selectedLayer.value) {
      if (selectedLayer.value.times) {
        const dates = selectedLayer.value.times.map((time) => {
          return new Date(time)
        })
        let firstValueDate = dates[0]
        let lastValueDate = dates[dates.length - 1]
        if (selectedLayer.value.firstValueTime) {
          firstValueDate = new Date(selectedLayer.value.firstValueTime)
        }
        if (selectedLayer.value.lastValueTime) {
          lastValueDate = new Date(selectedLayer.value.lastValueTime)
        }
        valueDates = dates.filter(
          (d) => d >= firstValueDate && d <= lastValueDate,
        )
      }
    }
    times.value = valueDates
  }

  async function loadLegend(): Promise<void> {
    const _layers = toValue(layerName)
    const _useDisplayUnits = toValue(useDisplayUnits)
    if (_layers === '') return
    try {
      legendGraphic.value = await wmsProvider.getLegendGraphic({
        layers: _layers,
        // Enable when fews-wms-requests is updated
        //@ts-ignore
        useDisplayUnits: _useDisplayUnits,
      })
    } catch (error) {
      console.error(error)
    }
  }

  watchEffect(() => {
    loadLegend()
    loadLayer().then(() => {
      loadTimes()
    })
  })
  return { selectedLayer, legendGraphic, times }
}

export function useWmsCapilities(
  baseUrl: string,
): Ref<GetCapabilitiesResponse | undefined> {
  const capabilities = ref<GetCapabilitiesResponse>()
  const wmsUrl = `${baseUrl}/wms`
  const wmsProvider = new WMSProvider(wmsUrl, {
    transformRequestFn: createTransformRequestFn(),
  })

  async function loadCapabilities(): Promise<void> {
    try {
      capabilities.value = await wmsProvider.getCapabilities({})
    } catch (error) {
      console.error(error)
    }
  }

  loadCapabilities()
  return capabilities
}

export function convertBoundingBoxToLngLatBounds(
  boundingBox: BoundingBox,
): LngLatBounds {
  const crs = boundingBox.crs

  const minx = parseFloat(boundingBox.minx)
  const miny = parseFloat(boundingBox.miny)
  const maxx = parseFloat(boundingBox.maxx)
  const maxy = parseFloat(boundingBox.maxy)

  const p1 = toWgs84(point([minx, miny], { crs: crs }))
  const p2 = toWgs84(point([maxx, maxy], { crs: crs }))
  return new LngLatBounds(
    [p1.geometry.coordinates[0], p1.geometry.coordinates[1]], // sw
    [p2.geometry.coordinates[0], p2.geometry.coordinates[1]], // ne
  )
}
