import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import SiteHeader from '../header'
import CommentSection from '../commentSection'
import type { Comment } from '../commentSection'
import LikeButton from '../likeButton'
import { api } from '../../api'
import { boardConfigs, defaultBoardConfig } from './boardConfig'
import '../../App.css'

const typeLabels: Record<string, string> = {
    free: '자유',
    library: '자료',
    question: '질문',
    notice: '공지',
}

interface Post {
    _id: string
    title: string
    content: string
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

function CommunityPostDetail() {
    const { board = '', type = '', id = '' } = useParams()
    const config = boardConfigs[board] ?? defaultBoardConfig
    const navigate = useNavigate()
    const [post, setPost] = useState<Post | null>(null)
    const [comments, setComments] = useState<Comment[]>([])
    const [loading, setLoading] = useState(true)
    const [loggedIn, setLoggedIn] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [liking, setLiking] = useState(false)
    const [deleting, setDeleting] = useState(false)
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
        const key = `${board}/${type}/${id}`
        if (fetchedRef.current === key) return
        fetchedRef.current = key

        setLoading(true)
        api.get(`/community/${board}/${type}/${id}`)
            .then(({ data }) => {
                setPost(data.success ? data.post : null)
                setComments(data.success ? data.post.comments ?? [] : [])
            })
            .catch(() => {
                setPost(null)
            })
            .finally(() => {
                setLoading(false)
            })
    }, [board, type, id])

    const postComment = async (content: string, parentId: string | null) => {
        try {
            const { data } = await api.post(`/community/${board}/${type}/${id}/comments`, { content, parentId })
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
            const { data } = await api.patch(`/community/${board}/${type}/${id}/comments/${commentId}`, { content })
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
            const { data } = await api.delete(`/community/${board}/${type}/${id}/comments/${commentId}`)
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
        if (liking || !post || !userId) return
        setLiking(true)
        try {
            const { data } = await api.post(`/community/${board}/${type}/${id}/like`)
            if (data.success) {
                setPost({
                    ...post,
                    like_count: data.like_count,
                    likes: data.liked
                        ? [...post.likes, userId]
                        : post.likes.filter((likeId) => likeId !== userId),
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

    const liked = !!(post && userId && post.likes.includes(userId))
    const canManage = !!(post && (post.uploaderId === userId || isAdmin))

    const deletePost = async () => {
        if (deleting || !window.confirm('게시글을 삭제하시겠습니까?')) return
        setDeleting(true)
        try {
            const { data } = await api.delete(`/community/${board}/${type}/${id}`)
            if (data.success) {
                navigate(`/community/${board}`)
            } else {
                alert(data.message)
            }
        } catch {
            alert('게시글 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.')
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
                    ) : !post ? (
                        <div className="board-empty">게시글을 찾을 수 없습니다.</div>
                    ) : (
                        <>
                            <article className="post-detail">
                                {post.imgsPath?.length > 0 && (
                                    <div className="care-sheet-gallery">
                                        {post.imgsPath.map((src) => (
                                            <img key={src} src={`${api.defaults.baseURL}${src}`} alt={post.title} />
                                        ))}
                                    </div>
                                )}
                                <div className="post-detail-head">
                                    <span className={`chip ${config.chipClass}`}>{typeLabels[type] ?? type}</span>
                                    <h1>{post.title}</h1>
                                </div>
                                <p className="post-detail-meta">
                                    <Link to={`/users/${post.uploaderId}`} className="author-link">{post.uploaderName}</Link>
                                    {' '}· {formatDateTime(post.createdAt)} · 조회 {post.view_count} · 댓글 {comments.length} · 추천 {post.like_count}
                                </p>
                                <div className="post-detail-content">{post.content}</div>
                                <LikeButton liked={liked} count={post.like_count} disabled={liking} onClick={toggleLike} />
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
                                <Link to={`/community/${board}/${type}/${id}/edit`} className="btn btn-ghost">수정</Link>
                                <button type="button" className="btn btn-danger" onClick={deletePost} disabled={deleting}>
                                    삭제
                                </button>
                            </>
                        )}
                        <Link to={`/community/${board}`} className="btn btn-ghost">목록으로</Link>
                    </div>
                </section>
            </main>

            <footer className="site-footer">
                <p>© 2026 우리들의 등,배각류 공간 · 낙엽 아래 작은 세계를 사랑하는 사람들</p>
            </footer>
        </div>
    )
}

export default CommunityPostDetail
