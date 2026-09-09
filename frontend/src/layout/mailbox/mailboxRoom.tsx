import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import SiteHeader from '../header'
import Avatar from '../avatar'
import { api } from '../../api'
import { getSocket } from '../../socket'
import '../../App.css'

interface RoomDetail {
    _id: string
    type: 'dm' | 'auction'
    auctionId: string | null
    otherUser: { _id: string | null; name: string; avatarPath: string; role: string }
}

interface ChatMessage {
    _id: string
    roomId: string
    senderId: string | null
    senderName: string
    content: string
    isSystem: boolean
    createdAt: string
}

function formatTime(value: string) {
    const date = new Date(value)
    if (isNaN(date.getTime())) return ''
    const hh = String(date.getHours()).padStart(2, '0')
    const mi = String(date.getMinutes()).padStart(2, '0')
    return `${hh}:${mi}`
}

function MailboxRoom() {
    const { roomId = '' } = useParams()
    const navigate = useNavigate()
    const [room, setRoom] = useState<RoomDetail | null>(null)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [loading, setLoading] = useState(true)
    const [myId, setMyId] = useState<string | null>(null)
    const [input, setInput] = useState('')
    const endRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        api.get('/auth/me')
            .then(({ data }) => {
                if (!data.success) {
                    alert('로그인이 필요합니다.')
                    navigate('/login')
                    return
                }
                setMyId(data.user._id)
            })
            .catch(() => navigate('/login'))
    }, [navigate])

    useEffect(() => {
        setLoading(true)
        Promise.all([api.get(`/chat/rooms/${roomId}`), api.get(`/chat/rooms/${roomId}/messages`)])
            .then(([roomRes, msgRes]) => {
                if (!roomRes.data.success) {
                    alert(roomRes.data.message)
                    navigate('/mailbox')
                    return
                }
                setRoom(roomRes.data.room)
                setMessages(msgRes.data.success ? msgRes.data.messages : [])
            })
            .catch(() => navigate('/mailbox'))
            .finally(() => setLoading(false))
    }, [roomId, navigate])

    useEffect(() => {
        const socket = getSocket()
        socket.emit('chatJoinRoom', { roomId })

        const onNewMessage = (payload: { message: ChatMessage }) => {
            setMessages((prev) => [...prev, payload.message])
        }
        const onError = (payload: { message: string }) => alert(payload.message)

        socket.on('chatNewMessage', onNewMessage)
        socket.on('chatError', onError)

        return () => {
            socket.emit('chatLeaveRoom', { roomId })
            socket.off('chatNewMessage', onNewMessage)
            socket.off('chatError', onError)
        }
    }, [roomId])

    useEffect(() => {
        endRef.current?.scrollIntoView({ block: 'nearest' })
    }, [messages])

    const send = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const trimmed = input.trim()
        if (!trimmed) return
        getSocket().emit('chatSendMessage', { roomId, content: trimmed })
        setInput('')
    }

    return (
        <div className="home">
            <SiteHeader />

            <main>
                <section className="section board-page">
                    {loading ? (
                        <div className="board-empty">불러오는 중...</div>
                    ) : !room ? (
                        <div className="board-empty">존재하지 않는 대화방입니다.</div>
                    ) : (
                        <>
                            <div className="board-head">
                                <Avatar src={room.otherUser.avatarPath} size={44} />
                                <div>
                                    <h1 className="board-head-title">
                                        {room.otherUser._id ? (
                                            <Link to={`/users/${room.otherUser._id}`} className="author-link">
                                                {room.otherUser.name}
                                            </Link>
                                        ) : (
                                            room.otherUser.name
                                        )}
                                    </h1>
                                    <p className="board-head-desc">{room.type === 'auction' ? '경매 거래 채팅방' : '쪽지'}</p>
                                </div>
                            </div>

                            <div className="comment-section chat-thread-section">
                                <div className="chat-thread">
                                    {messages.length === 0 ? (
                                        <div className="comment-empty">아직 메세지가 없습니다. 먼저 인사를 건네보세요!</div>
                                    ) : (
                                        messages.map((msg) => (
                                            <div
                                                key={msg._id}
                                                className={
                                                    msg.isSystem
                                                        ? 'chat-bubble chat-bubble-system'
                                                        : msg.senderId === myId
                                                          ? 'chat-bubble chat-bubble-mine'
                                                          : 'chat-bubble chat-bubble-theirs'
                                                }
                                            >
                                                {!msg.isSystem && msg.senderId !== myId && (
                                                    <span className="chat-bubble-sender">{msg.senderName}</span>
                                                )}
                                                <span className="chat-bubble-content">{msg.content}</span>
                                                <span className="chat-bubble-time">{formatTime(msg.createdAt)}</span>
                                            </div>
                                        ))
                                    )}
                                    <div ref={endRef} />
                                </div>

                                <form onSubmit={send} className="comment-form chat-input-form">
                                    <input
                                        className="field"
                                        placeholder="메세지를 입력하세요."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                    />
                                    <div className="comment-form-actions">
                                        <button className="btn btn-primary" type="submit">보내기</button>
                                    </div>
                                </form>
                            </div>
                        </>
                    )}

                    <div className="post-detail-actions">
                        <Link to="/mailbox" className="btn btn-ghost">우편함으로</Link>
                    </div>
                </section>
            </main>

            <footer className="site-footer">
                <p>© 2026 우리들의 등,배각류 공간 · 낙엽 아래 작은 세계를 사랑하는 사람들</p>
            </footer>
        </div>
    )
}

export default MailboxRoom
