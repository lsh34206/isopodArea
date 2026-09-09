import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import SiteHeader from '../header'
import CommentSection from '../commentSection'
import type { Comment } from '../commentSection'
import LikeButton from '../likeButton'
import { api } from '../../api'
import { boardConfigs, defaultBoardConfig } from '../community/boardConfig'
import '../../App.css'

interface Listing {
    _id: string
    title: string
    transactionType: string
    price: number
    species: string
    subSpecies: string
    description: string
    imgsPath: string[]
    sellerId: string
    sellerName: string
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

function formatPrice(price: number) {
    return price === 0 ? '무료 나눔' : `${price.toLocaleString()}원`
}

function MarketDetail() {
    const { board = '', id = '' } = useParams()
    const config = boardConfigs[board] ?? defaultBoardConfig
    const navigate = useNavigate()
    const [listing, setListing] = useState<Listing | null>(null)
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
        api.get(`/market/${board}/${id}`)
            .then(({ data }) => {
                setListing(data.success ? data.listing : null)
                setComments(data.success ? data.listing.comments ?? [] : [])
            })
            .catch(() => {
                setListing(null)
            })
            .finally(() => {
                setLoading(false)
            })
    }, [board, id])

    const prevImage = () => {
        if (!listing) return
        setActiveImage((i) => (i - 1 + listing.imgsPath.length) % listing.imgsPath.length)
    }

    const nextImage = () => {
        if (!listing) return
        setActiveImage((i) => (i + 1) % listing.imgsPath.length)
    }

    const postComment = async (content: string, parentId: string | null) => {
        try {
            const { data } = await api.post(`/market/${board}/${id}/comments`, { content, parentId })
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
            const { data } = await api.patch(`/market/${board}/${id}/comments/${commentId}`, { content })
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
            const { data } = await api.delete(`/market/${board}/${id}/comments/${commentId}`)
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
        if (liking || !listing || !userId) return
        setLiking(true)
        try {
            const { data } = await api.post(`/market/${board}/${id}/like`)
            if (data.success) {
                setListing({
                    ...listing,
                    like_count: data.like_count,
                    likes: data.liked
                        ? [...listing.likes, userId]
                        : listing.likes.filter((likeId) => likeId !== userId),
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

    const liked = !!(listing && userId && listing.likes.includes(userId))
    const canManage = !!(listing && (listing.sellerId === userId || isAdmin))

    const deleteListing = async () => {
        if (deleting || !window.confirm('분양글을 삭제하시겠습니까?')) return
        setDeleting(true)
        try {
            const { data } = await api.delete(`/market/${board}/${id}`)
            if (data.success) {
                navigate(`/market/${board}`)
            } else {
                alert(data.message)
            }
        } catch {
            alert('분양글 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.')
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
                    ) : !listing ? (
                        <div className="board-empty">분양글을 찾을 수 없습니다.</div>
                    ) : (
                        <>
                            <article className="care-sheet-detail">
                                {listing.imgsPath.length > 0 && (
                                    <div className="gallery-slideshow">
                                        <div className="gallery-slide">
                                            <img src={`${api.defaults.baseURL}${listing.imgsPath[activeImage]}`} alt={listing.title} />
                                            {listing.imgsPath.length > 1 && (
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
                                                    <span className="gallery-slide-count">{activeImage + 1} / {listing.imgsPath.length}</span>
                                                </>
                                            )}
                                        </div>
                                        {listing.imgsPath.length > 1 && (
                                            <div className="gallery-slide-dots">
                                                {listing.imgsPath.map((src, i) => (
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
                                    <span className="chip market-type-chip">{listing.transactionType}</span>
                                    <h1>{listing.title}</h1>
                                </div>
                                <p className="market-price-detail">{formatPrice(listing.price)}</p>
                                <p className="care-sheet-scientific-name">{listing.subSpecies} · {listing.species}</p>
                                <p className="post-detail-meta">
                                    <Link to={`/users/${listing.sellerId}`} className="author-link">{listing.sellerName}</Link>
                                    {' '}· {formatDateTime(listing.createdAt)} · 조회 {listing.view_count} · 댓글 {comments.length} · 추천 {listing.like_count}
                                </p>

                                <div className="gallery-description">{listing.description}</div>
                                <LikeButton liked={liked} count={listing.like_count} disabled={liking} onClick={toggleLike} />
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
                                <Link to={`/market/${board}/${id}/edit`} className="btn btn-ghost">수정</Link>
                                <button type="button" className="btn btn-danger" onClick={deleteListing} disabled={deleting}>
                                    삭제
                                </button>
                            </>
                        )}
                        <Link to={`/market/${board}`} className="btn btn-ghost">목록으로</Link>
                    </div>
                </section>
            </main>

            <footer className="site-footer">
                <p>© 2026 우리들의 등,배각류 공간 · 낙엽 아래 작은 세계를 사랑하는 사람들</p>
            </footer>
        </div>
    )
}

export default MarketDetail
