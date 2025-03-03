<template>
  <vue-slider
    class="elevation-slider"
    :model-value="currentValue"
    :max="maxValue"
    :min="minValue"
    :marks="marks"
    :interval="interval"
    @error="onError"
    @update:model-value="onInputChange"
    :keydownHook="onSliderKeydown"
    hideLabel
    direction="btt"
    tooltip="always"
    tooltipPlacement="left"
    height="200px"
    ref="sliderComponent"
  >
    <template v-slot:tooltip>
      <div
        class="vue-slider-dot-tooltip-inner vue-slider-dot-tooltip-inner-left vue-slider-dot-tooltip-text"
      >
        <input
          ref="tooltipInput"
          v-if="isEditing"
          v-model.number="editValue"
          @blur="acceptEdit"
          @keydown.stop="onKeydown"
          type="number"
          class="tooltip-input body-1"
        />
        <span v-else class="body-1" @click="activateEdit">{{
          Math.round(currentValue)
        }}</span>
        {{ props.unit }}
      </div>
    </template>
  </vue-slider>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, onMounted, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import VueSlider from 'vue-slider-component'
import 'vue-slider-component/theme/antd.css'

function roundToNearest100(x: number) {
  return Math.round(x / 100) * 100
}

// Get decimal places of float (e.g. floatPrecision(54.6545) == 4)
function floatPrecision(a: number) {
  if (!isFinite(a)) return 0
  var e = 1,
    p = 0
  while (Math.round(a * e) / e !== a) {
    e *= 10
    p++
  }
  return p
}

interface Props {
  modelValue: number
  minValue: number
  maxValue: number
  unit: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
  minValue: 0,
  maxValue: -10,
  unit: '',
})
const emit = defineEmits(['update:modelValue'])

const currentValue = ref(props.modelValue)
const editValue = ref(0)
const numberOfMarks = 8
const marks = ref<number[]>([])
const isEditing = ref(false)

const tooltipInput = ref<HTMLElement>()
const sliderComponent = ref<typeof VueSlider>()

const stepSize = (props.maxValue - props.minValue) / numberOfMarks

const onSliderKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    activateEdit()
  }
  return true
}

const onError = (err: Error) => {
  console.error(err)
}

const onInputChange = (value: number) => {
  currentValue.value = value
  emitModelValue(value)
}

const emitModelValue = useDebounceFn((value: number) => {
  emit('update:modelValue', value)
}, 400)

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    acceptEdit()
  } else if (e.key === 'Escape') {
    closeTooltip()
  }
}

const activateEdit = () => {
  isEditing.value = true
  editValue.value = Math.round(currentValue.value)
  nextTick(() => {
    if (tooltipInput.value) {
      tooltipInput.value.focus()
    }
    if (sliderComponent.value) sliderComponent.value.blur()
  })
}

const closeTooltip = () => {
  isEditing.value = false
  if (sliderComponent.value) {
    sliderComponent.value.focus({}, {})
  }
}

const acceptEdit = () => {
  if (editValue.value > props.maxValue) {
    currentValue.value = props.maxValue
  } else if (editValue.value < props.minValue) {
    currentValue.value = props.minValue
  } else {
    currentValue.value = editValue.value
  }
  emitModelValue(currentValue.value)
  closeTooltip()
}

onMounted(() => {
  const innerMarks = Array.from(
    { length: numberOfMarks - 1 },
    (_, i) => (i + 1) * -roundToNearest100(stepSize),
  )
  marks.value = [props.maxValue, ...innerMarks, props.minValue]
})

const interval = computed(() => {
  return 10 ** -floatPrecision(props.maxValue - props.minValue)
})

const onValueChange = () => {
  currentValue.value = props.modelValue
}

watch(() => props.modelValue, onValueChange)
</script>

<style scoped>
.vue-slider-dot-tooltip-text {
  font-family: var(--font-primary);
}

.elevation-slider {
  z-index: 2000;
  position: absolute;
  right: 5px;
  bottom: 115px;
}

.tooltip-input {
  width: 50px;
  height: 30px;
  margin: 0;
  padding: 0;
}
</style>
