import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { getSocket } from '../socket'

function SiteHeader() {
    const [user, setUser] = useState<{ name: string } | null>(null)
    const [query, setQuery] = useState('')
    const [unreadCount, setUnreadCount] = useState(0)
    const navigate = useNavigate()

    const refreshUnreadCount = () => {
        api.get('/chat/rooms/unread-count')
            .then(({ data }) => {
                if (data.success) setUnreadCount(data.count)
            })
            .catch(() => {})
    }

    useEffect(() => {
        api.get('/auth/me')
            .then(({ data }) => {
                if (data.success) {
                    setUser(data.user)
                    getSocket().emit('chatIdentify')
                    refreshUnreadCount()
                }
            })
            .catch(() => {})
    }, [])

    // 로그인 상태에서는 낙찰 안내/새 쪽지가 오면 실시간으로 배지를 갱신하고,
    // 소켓이 재연결됐을 때도 다시 알림방에 합류하도록 한다.
    useEffect(() => {
        if (!user) return
        const socket = getSocket()
        const onConnect = () => socket.emit('chatIdentify')
        const onMailboxUpdate = () => refreshUnreadCount()
        socket.on('connect', onConnect)
        socket.on('chatMailboxUpdate', onMailboxUpdate)
        return () => {
            socket.off('connect', onConnect)
            socket.off('chatMailboxUpdate', onMailboxUpdate)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])

    const logout = async () => {
        try {
            const { data } = await api.post('/auth/logout')
            alert(data.message)
            setUser(null)
            location.href = '/';
        } catch {
            alert('로그아웃에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        }
    }

    const submitSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const trimmed = query.trim()
        if (!trimmed) return
        navigate(`/search?q=${encodeURIComponent(trimmed)}`)
    }

    return (
        <header className="site-header">
            <Link to="/" className="brand">
                <span className="brand-mark">🌿</span>
                <span className="brand-text">우리들의 등,배각류 공간</span>
            </Link>
            <nav className="main-nav">
                <a href="/#boards">게시판</a>
                <a href="/#posts">최신 글</a>
                <a href="/#about">소개</a>
            </nav>
            <form onSubmit={submitSearch} className="header-search" role="search">
                <input
                    type="search"
                    className="header-search-input"
                    placeholder="검색"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="게시글 검색"
                />
                <button type="submit" className="header-search-submit" aria-label="검색">🔍</button>
            </form>
            <div className="header-actions">
                {user ? (
                    <>
                        <Link to="/mailbox" className="header-text-btn header-mailbox-link">
                            우편함
                            {unreadCount > 0 && <span className="header-mailbox-badge">{unreadCount}</span>}
                        </Link>
                        <span className="user-name">{user.name}님</span>
                        <Link to="/settings" className="header-text-btn">설정</Link>
                        <button type="button" onClick={logout} className="btn btn-ghost">로그아웃</button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className="btn btn-ghost">로그인</Link>
                        <Link to="/signup" className="btn btn-primary">회원가입</Link>
                    </>
                )}
            </div>
        </header>
    )
}

export default SiteHeader
