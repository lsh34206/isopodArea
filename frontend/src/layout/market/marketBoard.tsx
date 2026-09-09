import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import SiteHeader from '../header'
import Avatar from '../avatar'
import { api } from '../../api'
import { boardConfigs, defaultBoardConfig } from '../community/boardConfig'
import '../../App.css'

const boards = ['isopod', 'millipede'] as const

interface ListingSummary {
    _id: string
    title: string
    transactionType: string
    price: number
    sellerId: string
    sellerName: string
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

function formatPrice(price: number) {
    return price === 0 ? '무료 나눔' : `${price.toLocaleString()}원`
}

function MarketBoard() {
    const { board = '' } = useParams()
    const config = boardConfigs[board] ?? defaultBoardConfig
    const [listings, setListings] = useState<ListingSummary[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let ignore = false
        setLoading(true)
        api.get(`/market/${board}`)
            .then(({ data }) => {
                if (!ignore) setListings(data.success ? data.listings : [])
            })
            .catch(() => {
                if (!ignore) setListings([])
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
                        <span className="board-head-icon" aria-hidden>🐚</span>
                        <div>
                            <h1 className="board-head-title">{config.title.replace(' 게시판', ' 분양')}</h1>
                            <p className="board-head-desc">직접 기르는 개체를 분양하거나 무료로 나눠보세요.</p>
                        </div>
                    </div>

                    <div className="board-toolbar">
                        <div className="board-tabs" role="tablist">
                            {boards.map((b) => (
                                <Link
                                    key={b}
                                    to={`/market/${b}`}
                                    role="tab"
                                    aria-selected={board === b}
                                    className={board === b ? 'board-tab active' : 'board-tab'}
                                >
                                    {boardConfigs[b].icon} {boardConfigs[b].title.replace(' 게시판', '')}
                                </Link>
                            ))}
                        </div>
                        <Link to={`/market/write?type=${board}`} className="btn btn-primary">
                            분양 글쓰기
                        </Link>
                    </div>

                    {loading ? (
                        <div className="board-empty">불러오는 중...</div>
                    ) : listings.length === 0 ? (
                        <div className="board-empty">아직 등록된 분양 글이 없습니다. 첫 글을 남겨보세요!</div>
                    ) : (
                        <div className="gallery-grid">
                            {listings.map((listing) => (
                                <div key={listing._id} className="gallery-card">
                                    <Link to={`/market/${board}/${listing._id}`} className="gallery-card-link">
                                        <div className="gallery-thumb">
                                            {listing.imgsPath[0] ? (
                                                <img src={`${api.defaults.baseURL}${listing.imgsPath[0]}`} alt={listing.title} />
                                            ) : (
                                                <span aria-hidden>{config.icon}</span>
                                            )}
                                        </div>
                                        <div className="gallery-card-body">
                                            <span className="chip market-type-chip">{listing.transactionType}</span>
                                            <p className="gallery-title">{listing.title}</p>
                                            <p className="market-price">{formatPrice(listing.price)}</p>
                                        </div>
                                    </Link>
                                    <p className="post-meta gallery-card-meta">
                                        <span className="author-with-avatar">
                                            <Avatar src={listing.uploaderAvatar} size={20} />
                                            <Link to={`/users/${listing.sellerId}`} className="author-link">{listing.sellerName}</Link>
                                        </span>
                                        {' '}· {formatDate(listing.createdAt)} · 조회 {listing.view_count}
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

export default MarketBoard
