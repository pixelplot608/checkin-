/**
 * Combined Mood Snap (top) + Forest (below). One tab: Mood & Forest.
 */
import MoodSnap from './MoodSnap'
import Forest from './Forest'

export default function MoodForest() {
  return (
    <div className="space-y-10">
      <section id="mood-snap" className="scroll-mt-4">
        <MoodSnap />
      </section>
      <section id="forest" className="border-t border-[#e0dce8] pt-8">
        <Forest />
      </section>
    </div>
  )
}
