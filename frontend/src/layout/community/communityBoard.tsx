import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import SiteHeader from '../header'
import Avatar from '../avatar'
import { api } from '../../api'
import { boardConfigs, defaultBoardConfig } from './boardConfig'
import '../../App.css'

const boardTypes = [
    { key: 'free', label: '자유' },
    { key: 'library', label: '자료' },
    { key: 'question', label: '질문' },
    { key: 'notice', label: '공지' },
] as const

type BoardType = (typeof boardTypes)[number]['key']

interface Post {
    _id: string
    title: string
    imgsPath: string[]
    uploaderId: string
    uploaderName: string
    uploaderAvatar: string
    createdAt: string
    like_count: number
    comment_count: number
    view_count: number
}

function formatDate(value: string) {
    const date = new Date(value)
    if (isNaN(date.getTime())) return ''
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${date.getFullYear()}-${mm}-${dd}`
}

function CommunityBoard() {
    const { board = '' } = useParams()
    const config = boardConfigs[board] ?? defaultBoardConfig
    const [type, setType] = useState<BoardType>('free')
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let ignore = false
        setLoading(true)
        api.get(`/community/${board}/${type}`)
            .then(({ data }) => {
                if (!ignore) setPosts(data.success ? data.posts : [])
            })
            .catch(() => {
                if (!ignore) setPosts([])
            })
            .finally(() => {
                if (!ignore) setLoading(false)
            })
        return () => {
            ignore = true
        }
    }, [board, type])

    const currentLabel = boardTypes.find((t) => t.key === type)?.label

    return (
        <div className="home">
            <SiteHeader />

            <main>
                <section className="section board-page">
                    <div className="board-head">
                        <span className="board-head-icon" aria-hidden>{config.icon}</span>
                        <div>
                            <h1 className="board-head-title">{config.title}</h1>
                            <p className="board-head-desc">{config.description}</p>
                        </div>
                    </div>

                    <div className="board-toolbar">
                        <div className="board-tabs" role="tablist">
                            {boardTypes.map((t) => (
                                <button
                                    key={t.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={type === t.key}
                                    className={type === t.key ? 'board-tab active' : 'board-tab'}
                                    onClick={() => setType(t.key)}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <Link to={`/community/${board}/write?type=${type}`} className="btn btn-primary">
                            글쓰기
                        </Link>
                    </div>

                    {loading ? (
                        <div className="board-empty">불러오는 중...</div>
                    ) : posts.length === 0 ? (
                        <div className="board-empty">
                            아직 {currentLabel} 게시글이 없습니다. 첫 글을 남겨보세요!
                        </div>
                    ) : (
                        <ul className="post-list">
                            {posts.map((post) => (
                                <li key={post._id} className="post-item">
                                    {post.imgsPath?.length > 0 && (
                                        <Link to={`/community/${board}/${type}/${post._id}`} className="post-thumb">
                                            <img src={`${api.defaults.baseURL}${post.imgsPath[0]}`} alt="" />
                                        </Link>
                                    )}
                                    <span className={`chip ${config.chipClass}`}>{currentLabel}</span>
                                    <Link to={`/community/${board}/${type}/${post._id}`} className="post-title post-title-link">
                                        {post.title}
                                    </Link>
                                    <span className="post-meta">
                                        <span className="author-with-avatar">
                                            <Avatar src={post.uploaderAvatar} size={20} />
                                            <Link to={`/users/${post.uploaderId}`} className="author-link">{post.uploaderName}</Link>
                                        </span>
                                        {' '}· {formatDate(post.createdAt)} · 조회 {post.view_count} · 댓글 {post.comment_count} · 추천 {post.like_count}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </main>

            <footer className="site-footer">
                <p>© 2026 우리들의 등,배각류 공간 · 낙엽 아래 작은 세계를 사랑하는 사람들</p>
            </footer>
        </div>
    )
}

export default CommunityBoard
