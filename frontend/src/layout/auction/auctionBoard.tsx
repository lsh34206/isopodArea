import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import SiteHeader from '../header'
import Avatar from '../avatar'
import { api } from '../../api'
import { boardConfigs, defaultBoardConfig } from '../community/boardConfig'
import '../../App.css'

const boards = ['isopod', 'millipede'] as const

interface AuctionSummary {
    _id: string
    title: string
    startBid: number
    highBid: number
    highBidderName: string | null
    endTime: number
    status: boolean
    sellerId: string
    sellerName: string
    uploaderAvatar: string
    createdAt: string
    imgsPath: string[]
}

function formatPrice(price: number) {
    return `${price.toLocaleString()}원`
}

function formatRemaining(endTime: number) {
    const diff = endTime - Date.now()
    if (diff <= 0) return '종료'
    const totalMinutes = Math.floor(diff / 60_000)
    const days = Math.floor(totalMinutes / (60 * 24))
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
    const minutes = totalMinutes % 60
    if (days > 0) return `${days}일 ${hours}시간 남음`
    if (hours > 0) return `${hours}시간 ${minutes}분 남음`
    return `${minutes}분 남음`
}

function AuctionBoard() {
    const { board = '' } = useParams()
    const config = boardConfigs[board] ?? defaultBoardConfig
    const [auctions, setAuctions] = useState<AuctionSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [, forceTick] = useState(0)

    useEffect(() => {
        let ignore = false
        setLoading(true)
        api.get(`/auction/${board}`)
            .then(({ data }) => {
                if (!ignore) setAuctions(data.success ? data.auctions : [])
            })
            .catch(() => {
                if (!ignore) setAuctions([])
            })
            .finally(() => {
                if (!ignore) setLoading(false)
            })
        return () => {
            ignore = true
        }
    }, [board])

    // 남은 시간 표시를 위해 주기적으로 다시 렌더링
    useEffect(() => {
        const timer = setInterval(() => forceTick((t) => t + 1), 30_000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="home">
            <SiteHeader />

            <main>
                <section className="section board-page">
                    <div className="board-head">
                        <span className="board-head-icon" aria-hidden>🔨</span>
                        <div>
                            <h1 className="board-head-title">{config.title.replace(' 게시판', ' 실시간 경매')}</h1>
                            <p className="board-head-desc">실시간으로 입찰하며 원하는 개체를 낙찰받아 보세요.</p>
                        </div>
                    </div>

                    <div className="board-toolbar">
                        <div className="board-tabs" role="tablist">
                            {boards.map((b) => (
                                <Link
                                    key={b}
                                    to={`/auction/${b}`}
                                    role="tab"
                                    aria-selected={board === b}
                                    className={board === b ? 'board-tab active' : 'board-tab'}
                                >
                                    {boardConfigs[b].icon} {boardConfigs[b].title.replace(' 게시판', '')}
                                </Link>
                            ))}
                        </div>
                        <Link to={`/auction/write?type=${board}`} className="btn btn-primary">
                            경매 등록
                        </Link>
                    </div>

                    {loading ? (
                        <div className="board-empty">불러오는 중...</div>
                    ) : auctions.length === 0 ? (
                        <div className="board-empty">진행 중인 경매가 없습니다. 첫 경매를 등록해 보세요!</div>
                    ) : (
                        <div className="gallery-grid">
                            {auctions.map((auction) => (
                                <div key={auction._id} className="gallery-card">
                                    <Link to={`/auction/${board}/${auction._id}`} className="gallery-card-link">
                                        <div className="gallery-thumb">
                                            {auction.imgsPath[0] ? (
                                                <img src={`${api.defaults.baseURL}${auction.imgsPath[0]}`} alt={auction.title} />
                                            ) : (
                                                <span aria-hidden>{config.icon}</span>
                                            )}
                                        </div>
                                        <div className="gallery-card-body">
                                            <span className={auction.status ? 'chip chip-iso' : 'chip'}>
                                                {auction.status ? formatRemaining(auction.endTime) : '경매 종료'}
                                            </span>
                                            <p className="gallery-title">{auction.title}</p>
                                            <p className="market-price">
                                                {formatPrice(auction.highBid > 0 ? auction.highBid : auction.startBid)}
                                                {auction.highBid > 0 && <span className="auction-current-label"> (현재가)</span>}
                                            </p>
                                        </div>
                                    </Link>
                                    <p className="post-meta gallery-card-meta">
                                        <span className="author-with-avatar">
                                            <Avatar src={auction.uploaderAvatar} size={20} />
                                            <Link to={`/users/${auction.sellerId}`} className="author-link">{auction.sellerName}</Link>
                                        </span>
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

export default AuctionBoard
