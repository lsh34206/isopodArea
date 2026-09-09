interface LikeButtonProps {
    liked: boolean
    count: number
    disabled: boolean
    onClick: () => void
}

function LikeButton({ liked, count, disabled, onClick }: LikeButtonProps) {
    return (
        <div className="post-detail-footer">
            <button
                type="button"
                className={liked ? 'like-btn active' : 'like-btn'}
                onClick={onClick}
                disabled={disabled}
            >
                <span aria-hidden>{liked ? '❤️' : '🤍'}</span> 추천 {count}
            </button>
        </div>
    )
}

export default LikeButton
