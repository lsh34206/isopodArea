import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SiteHeader from '../header'
import Avatar from '../avatar'
import { api } from '../../api'
import { getSocket } from '../../socket'
import '../../App.css'

interface MailboxRoom {
    _id: string
    type: 'dm' | 'auction'
    auctionId: string | null
    lastMessage: string
    lastMessageTime: string
    otherUser: { _id: string | null; name: string; avatarPath: string }
    unreadCount: number
}

function formatTime(value: string) {
    const date = new Date(value)
    if (isNaN(date.getTime())) return ''
    const now = new Date()
    if (date.toDateString() === now.toDateString()) {
        const hh = String(date.getHours()).padStart(2, '0')
        const mi = String(date.getMinutes()).padStart(2, '0')
        return `${hh}:${mi}`
    }
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${mm}.${dd}`
}

function MailboxList() {
    const navigate = useNavigate()
    const [rooms, setRooms] = useState<MailboxRoom[]>([])
    const [loading, setLoading] = useState(true)
    const [ready, setReady] = useState(false)

    const load = () => {
        api.get('/chat/rooms')
            .then(({ data }) => setRooms(data.success ? data.rooms : []))
            .catch(() => setRooms([]))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        api.get('/auth/me')
            .then(({ data }) => {
                if (!data.success) {
                    alert('로그인이 필요합니다.')
                    navigate('/login')
                    return
                }
                setReady(true)
                load()
            })
            .catch(() => navigate('/login'))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate])

    useEffect(() => {
        if (!ready) return
        const socket = getSocket()
        const onUpdate = () => load()
        socket.on('chatMailboxUpdate', onUpdate)
        return () => {
            socket.off('chatMailboxUpdate', onUpdate)
        }
    }, [ready])

    return (
        <div className="home">
            <SiteHeader />

            <main>
                <section className="section board-page">
                    <div className="board-head">
                        <span className="board-head-icon" aria-hidden>✉️</span>
                        <div>
                            <h1 className="board-head-title">우편함</h1>
                            <p className="board-head-desc">회원들과 주고받은 쪽지와 경매 낙찰 안내를 확인하세요.</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="board-empty">불러오는 중...</div>
                    ) : rooms.length === 0 ? (
                        <div className="board-empty">아직 대화가 없습니다. 회원정보 페이지에서 쪽지를 보내보세요.</div>
                    ) : (
                        <ul className="mailbox-list">
                            {rooms.map((room) => (
                                <li key={room._id}>
                                    <Link to={`/mailbox/${room._id}`} className="mailbox-item">
                                        <Avatar src={room.otherUser.avatarPath} size={44} />
                                        <div className="mailbox-item-body">
                                            <span className="mailbox-item-top">
                                                <span className="mailbox-item-name">
                                                    {room.otherUser.name}
                                                    {room.type === 'auction' && (
                                                        <span className="chip chip-iso mailbox-item-chip">경매 거래</span>
                                                    )}
                                                </span>
                                                <span className="mailbox-item-time">{formatTime(room.lastMessageTime)}</span>
                                            </span>
                                            <span className="mailbox-item-preview">
                                                {room.lastMessage || '대화를 시작해 보세요.'}
                                            </span>
                                        </div>
                                        {room.unreadCount > 0 && <span className="mailbox-badge">{room.unreadCount}</span>}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="post-detail-actions">
                        <Link to="/" className="btn btn-ghost">홈으로</Link>
                    </div>
                </section>
            </main>

            <footer className="site-footer">
                <p>© 2026 우리들의 등,배각류 공간 · 낙엽 아래 작은 세계를 사랑하는 사람들</p>
            </footer>
        </div>
    )
}

export default MailboxList
