<template>
  <div
    ref="pupilRef"
    class="pupil"
    :style="{
      width: `${size}px`,
      height: isBlinking ? '2px' : `${size}px`,
      backgroundColor: pupilColor,
      transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
    }"
  />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  size: {
    type: Number,
    default: 12
  },
  maxDistance: {
    type: Number,
    default: 5
  },
  pupilColor: {
    type: String,
    default: 'black'
  },
  forceLookX: {
    type: Number,
    default: undefined
  },
  forceLookY: {
    type: Number,
    default: undefined
  },
  isBlinking: {
    type: Boolean,
    default: false
  }
})

const pupilRef = ref(null)
const mouseX = ref(null)
const mouseY = ref(null)

const handlePointerMove = (e) => {
  mouseX.value = e.clientX
  mouseY.value = e.clientY
}

const pupilPosition = computed(() => {
  if (!pupilRef.value) return { x: 0, y: 0 }

  // If forced look direction is provided, use that instead of mouse tracking
  if (props.forceLookX !== undefined && props.forceLookY !== undefined) {
    return { x: props.forceLookX, y: props.forceLookY }
  }

  if (mouseX.value === null || mouseY.value === null) {
    return { x: 0, y: 0 }
  }

  const pupil = pupilRef.value.getBoundingClientRect()
  const pupilCenterX = pupil.left + pupil.width / 2
  const pupilCenterY = pupil.top + pupil.height / 2

  const deltaX = mouseX.value - pupilCenterX
  const deltaY = mouseY.value - pupilCenterY
  const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), props.maxDistance)

  const angle = Math.atan2(deltaY, deltaX)
  const x = Math.cos(angle) * distance
  const y = Math.sin(angle) * distance

  return { x, y }
})

onMounted(() => {
  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  window.addEventListener('mousemove', handlePointerMove, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('mousemove', handlePointerMove)
})
</script>

<style scoped>
.pupil {
  border-radius: 50%;
  transition: transform 0.1s ease-out, height 0.15s ease-out;
  will-change: transform, height;
}
</style>
