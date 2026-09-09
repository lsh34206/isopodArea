import { api } from '../api'

interface AvatarProps {
    src?: string
    size?: number
    className?: string
}

function Avatar({ src, size = 26, className }: AvatarProps) {
    return (
        <span
            className={className ? `avatar ${className}` : 'avatar'}
            style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
        >
            {src ? (
                <img src={`${api.defaults.baseURL}${src}`} alt="" />
            ) : (
                <span aria-hidden>🌿</span>
            )}
        </span>
    )
}

export default Avatar
