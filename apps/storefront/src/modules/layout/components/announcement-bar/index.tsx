import { ANNOUNCEMENT } from "@lib/kudl/config"

const AnnouncementBar = () => {
  return (
    <div className="bg-kudl-dark text-white">
      <p className="content-container py-2 text-center text-[11px] leading-4 tracking-wide small:text-xs">
        {ANNOUNCEMENT}
      </p>
    </div>
  )
}

export default AnnouncementBar
