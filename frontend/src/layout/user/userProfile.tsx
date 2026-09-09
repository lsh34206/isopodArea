import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import SiteHeader from '../header'
import Avatar from '../avatar'
import { api } from '../../api'
import '../../App.css'

interface Profile {
    _id: string
    name: string
    role: string
    createdAt: string
    avatarPath: string
    bio: string
}

function formatDate(value: string) {
    const date = new Date(value)
    if (isNaN(date.getTime())) return ''
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${date.getFullYear()}-${mm}-${dd}`
}

function UserProfile() {
    const { id = '' } = useParams()
    const navigate = useNavigate()
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [myId, setMyId] = useState<string | null>(null)
    const [sending, setSending] = useState(false)
    // StrictMode의 이중 이펙트 실행 방지
    const fetchedRef = useRef('')

    useEffect(() => {
        api.get('/auth/me')
            .then(({ data }) => setMyId(data.success ? data.user._id : null))
            .catch(() => {})
    }, [])

    useEffect(() => {
        if (fetchedRef.current === id) return
        fetchedRef.current = id

        setLoading(true)
        api.get(`/auth/users/${id}`)
            .then(({ data }) => {
                setProfile(data.success ? data.user : null)
            })
            .catch(() => {
                setProfile(null)
            })
            .finally(() => {
                setLoading(false)
            })
    }, [id])

    const isMine = !!(profile && myId && profile._id === myId)

    const sendMessage = async () => {
        if (!myId) {
            alert('쪽지를 보내려면 로그인해 주세요.')
            navigate('/login')
            return
        }
        if (sending) return
        setSending(true)
        try {
            const { data } = await api.post('/chat/rooms/dm', { targetUserId: id })
            if (data.success) {
                navigate(`/mailbox/${data.room._id}`)
            } else {
                alert(data.message)
            }
        } catch {
            alert('쪽지방을 여는 데 실패했습니다. 잠시 후 다시 시도해 주세요.')
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="home">
            <SiteHeader />

            <main>
                <section className="section board-page">
                    {loading ? (
                        <div className="board-empty">불러오는 중...</div>
                    ) : !profile ? (
                        <div className="board-empty">
                            존재하지 않는 회원입니다. 탈퇴했거나 삭제된 계정일 수 있습니다.
                        </div>
                    ) : (
                        <article className="post-detail user-profile">
                            <Avatar src={profile.avatarPath} size={72} className="user-profile-avatar" />
                            {isMine && (
                                <Link to="/settings" className="user-profile-avatar-edit">설정</Link>
                            )}
                            <h1 className="user-profile-name">
                                {profile.name}
                                {profile.role === 'admin' && <span className="chip chip-admin">관리자</span>}
                            </h1>
                            <p className="post-detail-meta user-profile-meta">가입일 {formatDate(profile.createdAt)}</p>
                            {profile.bio && <p className="user-profile-bio">{profile.bio}</p>}
                        </article>
                    )}

                    <div className="post-detail-actions">
                        {!isMine && profile && (
                            <button type="button" className="btn btn-primary" onClick={sendMessage} disabled={sending}>
                                쪽지 보내기
                            </button>
                        )}
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

export default UserProfile
