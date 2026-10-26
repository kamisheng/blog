<template>
  <div
    ref="eyeRef"
    class="eyeball"
    :class="{ 'eyeball--sad': isSad }"
    :style="{
      width: `${size}px`,
      height: isBlinking ? '2px' : isSad ? `${size * 0.5}px` : `${size}px`,
      backgroundColor: eyeColor,
      borderRadius: isSad ? `0 0 ${size}px ${size}px` : '50%',
      transform: isSad ? `rotate(${sadRotate}deg)` : 'rotate(0deg)',
    }"
  >
    <div
      v-if="!isBlinking"
      class="pupil"
      :style="{
        width: `${pupilSize}px`,
        height: `${pupilSize}px`,
        backgroundColor: pupilColor,
        transform: `translate(${pupilPosition.x}px, ${isSad ? -1 : pupilPosition.y}px)`,
      }"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  size: {
    type: Number,
    default: 48
  },
  pupilSize: {
    type: Number,
    default: 16
  },
  maxDistance: {
    type: Number,
    default: 10
  },
  eyeColor: {
    type: String,
    default: 'white'
  },
  pupilColor: {
    type: String,
    default: 'black'
  },
  isBlinking: {
    type: Boolean,
    default: false
  },
  forceLookX: {
    type: Number,
    default: undefined
  },
  forceLookY: {
    type: Number,
    default: undefined
  },
  isSad: {
    type: Boolean,
    default: false
  },
  sadRotate: {
    type: Number,
    default: 0
  }
})

const eyeRef = ref(null)
// 未收到指针事件前留空，避免按 (0,0) 计算导致瞳孔固定偏向左下
const mouseX = ref(null)
const mouseY = ref(null)

const handlePointerMove = (e) => {
  mouseX.value = e.clientX
  mouseY.value = e.clientY
}

const pupilPosition = computed(() => {
  if (!eyeRef.value) return { x: 0, y: 0 }

  // If forced look direction is provided, use that instead of mouse tracking
  if (props.forceLookX !== undefined && props.forceLookY !== undefined) {
    return { x: props.forceLookX, y: props.forceLookY }
  }

  // 还没收到任何指针位置时保持居中
  if (mouseX.value === null || mouseY.value === null) {
    return { x: 0, y: 0 }
  }

  const eye = eyeRef.value.getBoundingClientRect()
  const eyeCenterX = eye.left + eye.width / 2
  const eyeCenterY = eye.top + eye.height / 2

  const deltaX = mouseX.value - eyeCenterX
  const deltaY = mouseY.value - eyeCenterY
  const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), props.maxDistance)

  const angle = Math.atan2(deltaY, deltaX)
  const x = Math.cos(angle) * distance
  const y = Math.sin(angle) * distance

  return { x, y }
})

onMounted(() => {
  // pointermove 同时覆盖鼠标、触控板、手写笔和触屏拖动；mousemove 作为老浏览器兜底
  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  window.addEventListener('mousemove', handlePointerMove, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('mousemove', handlePointerMove)
})
</script>

<style scoped>
.eyeball {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  will-change: height, border-radius, transform;
}

.pupil {
  border-radius: 50%;
  transition: transform 0.1s ease-out;
  will-change: transform;
}
</style>
