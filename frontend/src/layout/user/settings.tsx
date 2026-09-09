import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SiteHeader from '../header'
import Avatar from '../avatar'
import { api } from '../../api'
import '../../App.css'

const MAX_BIO_LENGTH = 300

function Settings() {
    const navigate = useNavigate()
    const [userId, setUserId] = useState<string | null>(null)
    const [avatarPath, setAvatarPath] = useState('')
    const [bio, setBio] = useState('')
    const [loading, setLoading] = useState(true)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [savingBio, setSavingBio] = useState(false)

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [changingPassword, setChangingPassword] = useState(false)

    const [withdrawPassword, setWithdrawPassword] = useState('')
    const [withdrawing, setWithdrawing] = useState(false)

    useEffect(() => {
        api.get('/auth/me')
            .then(({ data }) => {
                if (!data.success) {
                    alert('로그인이 필요합니다.')
                    navigate('/login')
                    return null
                }
                setUserId(data.user._id)
                return api.get(`/auth/users/${data.user._id}`)
            })
            .then((res) => {
                if (res && res.data.success) {
                    setAvatarPath(res.data.user.avatarPath ?? '')
                    setBio(res.data.user.bio ?? '')
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [navigate])

    const changeAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return

        const formData = new FormData()
        formData.append('avatar', file)

        setUploadingAvatar(true)
        try {
            const { data } = await api.post('/auth/me/avatar', formData)
            if (data.success) {
                setAvatarPath(data.avatarPath)
            } else {
                alert(data.message)
            }
        } catch {
            alert('프로필 사진 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        } finally {
            setUploadingAvatar(false)
        }
    }

    const saveBio = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSavingBio(true)
        try {
            const { data } = await api.patch('/auth/me/profile', { bio })
            alert(data.message)
        } catch {
            alert('저장에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        } finally {
            setSavingBio(false)
        }
    }

    const submitPasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setChangingPassword(true)
        try {
            const { data } = await api.patch('/auth/me/password', { currentPassword, newPassword })
            alert(data.message)
            if (data.success) {
                setCurrentPassword('')
                setNewPassword('')
            }
        } catch {
            alert('비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        } finally {
            setChangingPassword(false)
        }
    }

    const submitWithdraw = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!window.confirm('정말로 회원 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return
        setWithdrawing(true)
        try {
            const { data } = await api.delete('/auth/me', { data: { password: withdrawPassword } })
            alert(data.message)
            if (data.success) {
                window.location.href = '/'
            }
        } catch {
            alert('회원 탈퇴에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        } finally {
            setWithdrawing(false)
        }
    }

    if (loading) {
        return (
            <div className="home">
                <SiteHeader />
                <main>
                    <section className="section board-page">
                        <div className="board-empty">불러오는 중...</div>
                    </section>
                </main>
            </div>
        )
    }

    return (
        <div className="home">
            <SiteHeader />

            <main>
                <section className="section board-page">
                    <div className="board-head">
                        <span className="board-head-icon" aria-hidden>⚙️</span>
                        <div>
                            <h1 className="board-head-title">프로필 설정</h1>
                            <p className="board-head-desc">프로필 사진과 자기소개, 계정 정보를 관리해요.</p>
                        </div>
                    </div>

                    <div className="settings-section">
                        <h2 className="settings-section-title">프로필 사진</h2>
                        <div className="settings-avatar-row">
                            <Avatar src={avatarPath} size={64} />
                            <label className="btn btn-ghost">
                                {uploadingAvatar ? '업로드 중...' : '사진 변경'}
                                <input type="file" accept="image/*" onChange={changeAvatar} disabled={uploadingAvatar} hidden />
                            </label>
                        </div>
                    </div>

                    <form onSubmit={saveBio} className="settings-section form-stack">
                        <h2 className="settings-section-title">자기소개</h2>
                        <textarea
                            className="field"
                            placeholder="다른 사육자들에게 자신을 소개해 보세요."
                            value={bio}
                            onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
                            maxLength={MAX_BIO_LENGTH}
                        />
                        <div className="settings-bio-footer">
                            <span className="settings-char-count">{bio.length} / {MAX_BIO_LENGTH}</span>
                            <button className="btn btn-primary" type="submit" disabled={savingBio}>저장</button>
                        </div>
                    </form>

                    <form onSubmit={submitPasswordChange} className="settings-section form-stack">
                        <h2 className="settings-section-title">비밀번호 변경</h2>
                        <input
                            className="field"
                            type="password"
                            placeholder="현재 비밀번호"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                        />
                        <input
                            className="field"
                            type="password"
                            placeholder="새 비밀번호 (8자 이상)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            minLength={8}
                            required
                        />
                        <div className="write-actions">
                            <button className="btn btn-primary" type="submit" disabled={changingPassword}>비밀번호 변경</button>
                        </div>
                    </form>

                    <form onSubmit={submitWithdraw} className="settings-section form-stack">
                        <h2 className="settings-section-title settings-danger-title">회원 탈퇴</h2>
                        <p className="settings-danger-desc">
                            탈퇴하면 계정이 삭제되고 되돌릴 수 없습니다. 작성한 글과 댓글은 "탈퇴된 회원"으로 표시되어 남아있습니다.
                        </p>
                        <input
                            className="field"
                            type="password"
                            placeholder="비밀번호 확인"
                            value={withdrawPassword}
                            onChange={(e) => setWithdrawPassword(e.target.value)}
                            required
                        />
                        <div className="write-actions">
                            <button className="btn btn-danger" type="submit" disabled={withdrawing}>회원 탈퇴</button>
                        </div>
                    </form>

                    <div className="post-detail-actions">
                        {userId && <Link to={`/users/${userId}`} className="btn btn-ghost">내 프로필 보기</Link>}
                    </div>
                </section>
            </main>

            <footer className="site-footer">
                <p>© 2026 우리들의 등,배각류 공간 · 낙엽 아래 작은 세계를 사랑하는 사람들</p>
            </footer>
        </div>
    )
}

export default Settings
