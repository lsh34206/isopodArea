import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import SiteHeader from '../header'
import Avatar from '../avatar'
import { api } from '../../api'
import { boardConfigs, defaultBoardConfig } from '../community/boardConfig'
import '../../App.css'

const boards = ['isopod', 'millipede'] as const

interface PhotoSummary {
    _id: string
    title: string
    uploaderId: string
    uploaderName: string
    uploaderAvatar: string
    createdAt: string
    imgsPath: string[]
    view_count: number
    like_count: number
    comment_count: number
}

function formatDate(value: string) {
    const date = new Date(value)
    if (isNaN(date.getTime())) return ''
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${date.getFullYear()}-${mm}-${dd}`
}

function GalleryBoard() {
    const { board = '' } = useParams()
    const config = boardConfigs[board] ?? defaultBoardConfig
    const [photos, setPhotos] = useState<PhotoSummary[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let ignore = false
        setLoading(true)
        api.get(`/photo/${board}`)
            .then(({ data }) => {
                if (!ignore) setPhotos(data.success ? data.photos : [])
            })
            .catch(() => {
                if (!ignore) setPhotos([])
            })
            .finally(() => {
                if (!ignore) setLoading(false)
            })
        return () => {
            ignore = true
        }
    }, [board])

    return (
        <div className="home">
            <SiteHeader />

            <main>
                <section className="section board-page">
                    <div className="board-head">
                        <span className="board-head-icon" aria-hidden>📷</span>
                        <div>
                            <h1 className="board-head-title">{config.title.replace(' 게시판', ' 갤러리')}</h1>
                            <p className="board-head-desc">내 사육장과 아이들을 마음껏 자랑하는 공간.</p>
                        </div>
                    </div>

                    <div className="board-toolbar">
                        <div className="board-tabs" role="tablist">
                            {boards.map((b) => (
                                <Link
                                    key={b}
                                    to={`/gallery/${b}`}
                                    role="tab"
                                    aria-selected={board === b}
                                    className={board === b ? 'board-tab active' : 'board-tab'}
                                >
                                    {boardConfigs[b].icon} {boardConfigs[b].title.replace(' 게시판', '')}
                                </Link>
                            ))}
                        </div>
                        <Link to={`/gallery/write?type=${board}`} className="btn btn-primary">
                            사진 올리기
                        </Link>
                    </div>

                    {loading ? (
                        <div className="board-empty">불러오는 중...</div>
                    ) : photos.length === 0 ? (
                        <div className="board-empty">아직 등록된 사진이 없습니다. 첫 사진을 올려보세요!</div>
                    ) : (
                        <div className="gallery-grid">
                            {photos.map((photo) => (
                                <div key={photo._id} className="gallery-card">
                                    <Link to={`/gallery/${board}/${photo._id}`} className="gallery-card-link">
                                        <div className="gallery-thumb">
                                            {photo.imgsPath[0] ? (
                                                <img src={`${api.defaults.baseURL}${photo.imgsPath[0]}`} alt={photo.title} />
                                            ) : (
                                                <span aria-hidden>{config.icon}</span>
                                            )}
                                        </div>
                                        <div className="gallery-card-body">
                                            <p className="gallery-title">{photo.title}</p>
                                        </div>
                                    </Link>
                                    <p className="post-meta gallery-card-meta">
                                        <span className="author-with-avatar">
                                            <Avatar src={photo.uploaderAvatar} size={20} />
                                            <Link to={`/users/${photo.uploaderId}`} className="author-link">{photo.uploaderName}</Link>
                                        </span>
                                        {' '}· {formatDate(photo.createdAt)} · 조회 {photo.view_count}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            <footer className="site-footer">
                <p>© 2026 우리들의 등,배각류 공간 · 낙엽 아래 작은 세계를 사랑하는 사람들</p>
            </footer>
        </div>
    )
}

export default GalleryBoard
