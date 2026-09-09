import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import SiteHeader from '../header'
import { api } from '../../api'
import { getSocket } from '../../socket'
import { boardConfigs, defaultBoardConfig } from '../community/boardConfig'
import '../../App.css'

const MIN_BID_STEP = 100

interface Auction {
    _id: string
    title: string
    type: string
    species: string
    subSpecies: string
    description: string
    imgsPath: string[]
    sellerId: string
    sellerName: string
    startBid: number
    endTime: number
    highBid: number
    highBidderId: string | null
    highBidderName: string | null
    status: boolean
    createdAt: string
}

interface ActivityEntry {
    _id: string
    senderId: string
    senderName: string
    message: string
    messageType: 'chat' | 'system' | 'bid'
    bidPrice: number | null
    createdAt: string
}

interface Viewer {
    id: string
    name: string
    isGuest: boolean
}

function formatPrice(price: number) {
    return `${price.toLocaleString()}원`
}

function formatDateTime(value: string) {
    const date = new Date(value)
    if (isNaN(date.getTime())) return ''
    const hh = String(date.getHours()).padStart(2, '0')
    const mi = String(date.getMinutes()).padStart(2, '0')
    return `${hh}:${mi}`
}

function formatRemaining(ms: number) {
    if (ms <= 0) return '종료됨'
    const totalSeconds = Math.floor(ms / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    if (days > 0) return `${days}일 ${hours}시간 ${minutes}분`
    if (hours > 0) return `${hours}시간 ${minutes}분 ${seconds}초`
    return `${minutes}분 ${seconds}초`
}

function AuctionRoom() {
    const { board = '', id = '' } = useParams()
    const config = boardConfigs[board] ?? defaultBoardConfig
    const navigate = useNavigate()
    const [auction, setAuction] = useState<Auction | null>(null)
    const [activity, setActivity] = useState<ActivityEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)
    const [loggedIn, setLoggedIn] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const [bidInput, setBidInput] = useState('')
    const [chatInput, setChatInput] = useState('')
    const [now, setNow] = useState(Date.now())
    const [deleting, setDeleting] = useState(false)
    const [viewers, setViewers] = useState<Viewer[]>([])
    const activityEndRef = useRef<HTMLDivElement>(null)

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
        setLoading(true)
        api.get(`/auction/${board}/${id}`)
            .then(({ data }) => {
                setAuction(data.success ? data.auction : null)
                setActivity(data.success ? data.activity : [])
            })
            .catch(() => setAuction(null))
            .finally(() => setLoading(false))
    }, [board, id])

    useEffect(() => {
        const socket = getSocket()
        socket.emit('joinRoom', { auctionId: id })

        const onRoomState = (state: { auction: Auction; activity: ActivityEntry[] }) => {
            setAuction(state.auction)
            setActivity(state.activity)
        }
        const onNewBid = (payload: { auction: Auction; chat: ActivityEntry }) => {
            setAuction(payload.auction)
            setActivity((prev) => [...prev, payload.chat])
        }
        const onNewChat = (payload: { chat: ActivityEntry }) => {
            setActivity((prev) => [...prev, payload.chat])
        }
        const onAuctionEnded = (payload: { auction: Auction; chat: ActivityEntry }) => {
            setAuction(payload.auction)
            setActivity((prev) => [...prev, payload.chat])
        }
        const onBidRejected = (payload: { message: string }) => alert(payload.message)
        const onChatRejected = (payload: { message: string }) => alert(payload.message)
        const onError = (payload: { message: string }) => alert(payload.message)
        const onViewerList = (payload: { viewers: Viewer[] }) => setViewers(payload.viewers)

        socket.on('roomState', onRoomState)
        socket.on('newBid', onNewBid)
        socket.on('newChat', onNewChat)
        socket.on('auctionEnded', onAuctionEnded)
        socket.on('bidRejected', onBidRejected)
        socket.on('chatRejected', onChatRejected)
        socket.on('error', onError)
        socket.on('viewerList', onViewerList)

        return () => {
            socket.emit('leaveRoom', { auctionId: id })
            socket.off('roomState', onRoomState)
            socket.off('newBid', onNewBid)
            socket.off('newChat', onNewChat)
            socket.off('auctionEnded', onAuctionEnded)
            socket.off('bidRejected', onBidRejected)
            socket.off('chatRejected', onChatRejected)
            socket.off('error', onError)
            socket.off('viewerList', onViewerList)
        }
    }, [id])

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        activityEndRef.current?.scrollIntoView({ block: 'nearest' })
    }, [activity])

    const currentPrice = auction ? (auction.highBid > 0 ? auction.highBid : auction.startBid) : 0
    const minNextBid = auction ? (auction.highBidderId ? auction.highBid + MIN_BID_STEP : auction.startBid) : 0
    const remainingMs = auction ? auction.endTime - now : 0
    const isEnded = !!auction && (!auction.status || remainingMs <= 0)
    const isSeller = !!auction && auction.sellerId === userId

    const placeBid = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!loggedIn) {
            alert('입찰하려면 로그인해 주세요.')
            return
        }
        const bidPrice = Number(bidInput)
        if (!Number.isFinite(bidPrice) || bidPrice < minNextBid) {
            alert(`최소 ${minNextBid.toLocaleString()}원 이상 입력해 주세요.`)
            return
        }
        getSocket().emit('placeBid', { auctionId: id, bidPrice })
        setBidInput('')
    }

    const sendChat = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!loggedIn) {
            alert('채팅을 남기려면 로그인해 주세요.')
            return
        }
        if (!chatInput.trim()) return
        getSocket().emit('sendChat', { auctionId: id, message: chatInput.trim() })
        setChatInput('')
    }

    const deleteAuction = async () => {
        if (deleting || !window.confirm('경매를 삭제하시겠습니까?')) return
        setDeleting(true)
        try {
            const { data } = await api.delete(`/auction/${board}/${id}`)
            if (data.success) {
                navigate(`/auction/${board}`)
            } else {
                alert(data.message)
            }
        } catch {
            alert('삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        } finally {
            setDeleting(false)
        }
    }

    const canDelete = !!auction && (isSeller || isAdmin) && !auction.highBidderId

    return (
        <div className="home">
            <SiteHeader />

            <main>
                <section className="section board-page">
                    {loading ? (
                        <div className="board-empty">불러오는 중...</div>
                    ) : !auction ? (
                        <div className="board-empty">존재하지 않는 경매입니다.</div>
                    ) : (
                        <>
                            <article className="care-sheet-detail">
                                {auction.imgsPath.length > 0 && (
                                    <div className="care-sheet-gallery">
                                        {auction.imgsPath.map((src) => (
                                            <img key={src} src={`${api.defaults.baseURL}${src}`} alt={auction.title} />
                                        ))}
                                    </div>
                                )}

                                <div className="post-detail-head">
                                    <span className={`chip ${config.chipClass}`}>{config.title.replace(' 게시판', '')}</span>
                                    <span className={isEnded ? 'chip' : 'chip chip-iso'}>{isEnded ? '경매 종료' : '경매 진행중'}</span>
                                    <h1>{auction.title}</h1>
                                </div>
                                <p className="care-sheet-scientific-name">{auction.subSpecies} · {auction.species}</p>
                                <p className="post-detail-meta">
                                    <Link to={`/users/${auction.sellerId}`} className="author-link">{auction.sellerName}</Link>
                                    {' '}판매 · 시작가 {formatPrice(auction.startBid)}
                                </p>

                                <div className="auction-price-board">
                                    <div>
                                        <span className="auction-price-label">{isEnded ? '낙찰가' : '현재가'}</span>
                                        <p className="market-price-detail">
                                            {isEnded && !auction.highBidderId ? '유찰' : formatPrice(currentPrice)}
                                        </p>
                                        {auction.highBidderName && (
                                            <p className="post-detail-meta auction-price-meta">
                                                최고 입찰자: {auction.highBidderName}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <span className="auction-price-label">{isEnded ? '상태' : '남은 시간'}</span>
                                        <p className={isEnded ? 'auction-timer ended' : 'auction-timer'}>
                                            {isEnded ? '종료됨' : formatRemaining(remainingMs)}
                                        </p>
                                    </div>
                                </div>

                                {!isEnded && !isSeller && (
                                    <form onSubmit={placeBid} className="auction-bid-form">
                                        <input
                                            className="field"
                                            type="number"
                                            min={minNextBid}
                                            step={MIN_BID_STEP}
                                            placeholder={`${minNextBid.toLocaleString()}원 이상`}
                                            value={bidInput}
                                            onChange={(e) => setBidInput(e.target.value)}
                                        />
                                        <button className="btn btn-primary" type="submit">입찰하기</button>
                                    </form>
                                )}
                                {isSeller && !isEnded && (
                                    <p className="board-empty">본인이 등록한 경매에는 입찰할 수 없습니다.</p>
                                )}

                                <div className="gallery-description auction-description">{auction.description}</div>
                            </article>

                            <div className="comment-section auction-activity">
                                <div className="auction-activity-header">
                                    <h2 className="comment-section-title">실시간 현황</h2>
                                    <span className="auction-viewer-count" title="현재 이 경매를 보고 있는 인원">
                                        👀 {viewers.length.toLocaleString()}명 접속중
                                    </span>
                                </div>
                                {viewers.length > 0 && (
                                    <ul className="auction-viewer-list">
                                        {viewers.map((viewer) => (
                                            <li
                                                key={viewer.id}
                                                className={viewer.isGuest ? 'auction-viewer-chip guest' : 'auction-viewer-chip'}
                                            >
                                                {viewer.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <div className="auction-activity-log">
                                    {activity.length === 0 ? (
                                        <div className="comment-empty">아직 활동이 없습니다. 가장 먼저 입찰하거나 채팅을 남겨보세요!</div>
                                    ) : (
                                        activity.map((entry) => (
                                            <div key={entry._id} className={`auction-activity-item auction-activity-${entry.messageType}`}>
                                                <span className="auction-activity-time">{formatDateTime(entry.createdAt)}</span>
                                                {entry.messageType !== 'system' && (
                                                    <span className="auction-activity-sender">{entry.senderName}</span>
                                                )}
                                                <span className="auction-activity-message">{entry.message}</span>
                                            </div>
                                        ))
                                    )}
                                    <div ref={activityEndRef} />
                                </div>

                                {loggedIn ? (
                                    <form onSubmit={sendChat} className="comment-form">
                                        <textarea
                                            className="field"
                                            placeholder="채팅을 입력해 주세요."
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                        />
                                        <div className="comment-form-actions">
                                            <button className="btn btn-primary" type="submit">보내기</button>
                                        </div>
                                    </form>
                                ) : (
                                    <p className="comment-login-notice">
                                        채팅을 남기려면 <Link to="/login">로그인</Link>해 주세요.
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    <div className="post-detail-actions">
                        {canDelete && (
                            <button type="button" className="btn btn-danger" onClick={deleteAuction} disabled={deleting}>
                                삭제
                            </button>
                        )}
                        <Link to={`/auction/${board}`} className="btn btn-ghost">목록으로</Link>
                    </div>
                </section>
            </main>

            <footer className="site-footer">
                <p>© 2026 우리들의 등,배각류 공간 · 낙엽 아래 작은 세계를 사랑하는 사람들</p>
            </footer>
        </div>
    )
}

export default AuctionRoom
