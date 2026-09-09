import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import SiteHeader from '../header'
import CommentSection from '../commentSection'
import type { Comment } from '../commentSection'
import LikeButton from '../likeButton'
import { api } from '../../api'
import { boardConfigs, defaultBoardConfig } from '../community/boardConfig'
import '../../App.css'

interface Photo {
    _id: string
    title: string
    species: string
    subSpecies: string
    description: string
    imgsPath: string[]
    uploaderId: string
    uploaderName: string
    createdAt: string
    likes: string[]
    like_count: number
    comment_count: number
    view_count: number
}

function formatDateTime(value: string) {
    const date = new Date(value)
    if (isNaN(date.getTime())) return ''
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mi = String(date.getMinutes()).padStart(2, '0')
    return `${date.getFullYear()}-${mm}-${dd} ${hh}:${mi}`
}

function GalleryDetail() {
    const { board = '', id = '' } = useParams()
    const config = boardConfigs[board] ?? defaultBoardConfig
    const navigate = useNavigate()
    const [photo, setPhoto] = useState<Photo | null>(null)
    const [comments, setComments] = useState<Comment[]>([])
    const [loading, setLoading] = useState(true)
    const [loggedIn, setLoggedIn] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [liking, setLiking] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [activeImage, setActiveImage] = useState(0)
    // StrictMode의 이중 이펙트 실행으로 조회수가 2번 오르는 것 방지
    const fetchedRef = useRef('')

    useEffect(() => {
        api.get('/auth/me')
            .then(({ data }) => {
                setLoggedIn(data.success)
                setUserId(data.success ? data.user._id : null)
                setIsAdmin(data.success && data.user.role === 'admin')
            })
            .catch(() => setLoggedIn(false))
    }, [])

    useEffect(() => {
        const key = `${board}/${id}`
        if (fetchedRef.current === key) return
        fetchedRef.current = key

        setLoading(true)
        setActiveImage(0)
        api.get(`/photo/${board}/${id}`)
            .then(({ data }) => {
                setPhoto(data.success ? data.photo : null)
                setComments(data.success ? data.photo.comments ?? [] : [])
            })
            .catch(() => {
                setPhoto(null)
            })
            .finally(() => {
                setLoading(false)
            })
    }, [board, id])

    const prevImage = () => {
        if (!photo) return
        setActiveImage((i) => (i - 1 + photo.imgsPath.length) % photo.imgsPath.length)
    }

    const nextImage = () => {
        if (!photo) return
        setActiveImage((i) => (i + 1) % photo.imgsPath.length)
    }

    const postComment = async (content: string, parentId: string | null) => {
        try {
            const { data } = await api.post(`/photo/${board}/${id}/comments`, { content, parentId })
            if (data.success) {
                setComments(data.comments)
            } else {
                alert(data.message)
            }
        } catch {
            alert('댓글 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        }
    }

    const editComment = async (commentId: string, content: string) => {
        try {
            const { data } = await api.patch(`/photo/${board}/${id}/comments/${commentId}`, { content })
            if (data.success) {
                setComments(data.comments)
            } else {
                alert(data.message)
            }
        } catch {
            alert('댓글 수정에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        }
    }

    const deleteComment = async (commentId: string) => {
        try {
            const { data } = await api.delete(`/photo/${board}/${id}/comments/${commentId}`)
            if (data.success) {
                setComments(data.comments)
            } else {
                alert(data.message)
            }
        } catch {
            alert('댓글 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        }
    }

    const toggleLike = async () => {
        if (!loggedIn) {
            alert('좋아요를 누르려면 로그인해 주세요.')
            return
        }
        if (liking || !photo || !userId) return
        setLiking(true)
        try {
            const { data } = await api.post(`/photo/${board}/${id}/like`)
            if (data.success) {
                setPhoto({
                    ...photo,
                    like_count: data.like_count,
                    likes: data.liked
                        ? [...photo.likes, userId]
                        : photo.likes.filter((likeId) => likeId !== userId),
                })
            } else {
                alert(data.message)
            }
        } catch {
            alert('요청에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        } finally {
            setLiking(false)
        }
    }

    const liked = !!(photo && userId && photo.likes.includes(userId))
    const canManage = !!(photo && (photo.uploaderId === userId || isAdmin))

    const deletePhoto = async () => {
        if (deleting || !window.confirm('사진을 삭제하시겠습니까?')) return
        setDeleting(true)
        try {
            const { data } = await api.delete(`/photo/${board}/${id}`)
            if (data.success) {
                navigate(`/gallery/${board}`)
            } else {
                alert(data.message)
            }
        } catch {
            alert('사진 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="home">
            <SiteHeader />

            <main>
                <section className="section board-page">
                    {loading ? (
                        <div className="board-empty">불러오는 중...</div>
                    ) : !photo ? (
                        <div className="board-empty">사진을 찾을 수 없습니다.</div>
                    ) : (
                        <>
                            <article className="care-sheet-detail">
                                {photo.imgsPath.length > 0 && (
                                    <div className="gallery-slideshow">
                                        <div className="gallery-slide">
                                            <img src={`${api.defaults.baseURL}${photo.imgsPath[activeImage]}`} alt={photo.title} />
                                            {photo.imgsPath.length > 1 && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="gallery-slide-nav gallery-slide-prev"
                                                        onClick={prevImage}
                                                        aria-label="이전 사진"
                                                    >
                                                        ‹
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="gallery-slide-nav gallery-slide-next"
                                                        onClick={nextImage}
                                                        aria-label="다음 사진"
                                                    >
                                                        ›
                                                    </button>
                                                    <span className="gallery-slide-count">{activeImage + 1} / {photo.imgsPath.length}</span>
                                                </>
                                            )}
                                        </div>
                                        {photo.imgsPath.length > 1 && (
                                            <div className="gallery-slide-dots">
                                                {photo.imgsPath.map((src, i) => (
                                                    <button
                                                        key={src}
                                                        type="button"
                                                        className={i === activeImage ? 'gallery-slide-dot active' : 'gallery-slide-dot'}
                                                        onClick={() => setActiveImage(i)}
                                                        aria-label={`${i + 1}번째 사진`}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="post-detail-head">
                                    <span className={`chip ${config.chipClass}`}>{config.title.replace(' 게시판', '')}</span>
                                    <h1>{photo.title}</h1>
                                </div>
                                <p className="care-sheet-scientific-name">{photo.subSpecies} · {photo.species}</p>
                                <p className="post-detail-meta">
                                    <Link to={`/users/${photo.uploaderId}`} className="author-link">{photo.uploaderName}</Link>
                                    {' '}· {formatDateTime(photo.createdAt)} · 조회 {photo.view_count} · 댓글 {comments.length} · 추천 {photo.like_count}
                                </p>

                                <div className="gallery-description">{photo.description}</div>
                                <LikeButton liked={liked} count={photo.like_count} disabled={liking} onClick={toggleLike} />
                            </article>

                            <CommentSection
                                comments={comments}
                                loggedIn={loggedIn}
                                currentUserId={userId}
                                onSubmit={postComment}
                                onEdit={editComment}
                                onDelete={deleteComment}
                            />
                        </>
                    )}

                    <div className="post-detail-actions">
                        {canManage && (
                            <>
                                <Link to={`/gallery/${board}/${id}/edit`} className="btn btn-ghost">수정</Link>
                                <button type="button" className="btn btn-danger" onClick={deletePhoto} disabled={deleting}>
                                    삭제
                                </button>
                            </>
                        )}
                        <Link to={`/gallery/${board}`} className="btn btn-ghost">목록으로</Link>
                    </div>
                </section>
            </main>

            <footer className="site-footer">
                <p>© 2026 우리들의 등,배각류 공간 · 낙엽 아래 작은 세계를 사랑하는 사람들</p>
            </footer>
        </div>
    )
}

export default GalleryDetail
