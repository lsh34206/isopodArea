import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import SiteHeader from '../header'
import { api } from '../../api'
import { boardConfigs, defaultBoardConfig } from '../community/boardConfig'
import { parseDescription } from './careSheetFields'
import '../../App.css'

interface CareSheet {
    _id: string
    species: string
    subSpecies: string
    description: string
    imgsPath: string[]
    uploaderId: string
    uploaderName: string
    createdAt: string
    like_count: number
    comment_count: number
    view_count: number
}

const SPEC_LABELS = ['난이도', '적정온도', '적정습도', '먹이', '습성', '성장속도'] as const

function formatDateTime(value: string) {
    const date = new Date(value)
    if (isNaN(date.getTime())) return ''
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mi = String(date.getMinutes()).padStart(2, '0')
    return `${date.getFullYear()}-${mm}-${dd} ${hh}:${mi}`
}

function CareSheetDetail() {
    const { board = '', id = '' } = useParams()
    const config = boardConfigs[board] ?? defaultBoardConfig
    const navigate = useNavigate()
    const [careSheet, setCareSheet] = useState<CareSheet | null>(null)
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [deleting, setDeleting] = useState(false)
    // StrictMode의 이중 이펙트 실행으로 조회수가 2번 오르는 것 방지
    const fetchedRef = useRef('')

    useEffect(() => {
        api.get('/auth/me')
            .then(({ data }) => {
                setUserId(data.success ? data.user._id : null)
                setIsAdmin(data.success && data.user.role === 'admin')
            })
            .catch(() => {})
    }, [])

    useEffect(() => {
        const key = `${board}/${id}`
        if (fetchedRef.current === key) return
        fetchedRef.current = key

        setLoading(true)
        api.get(`/care-sheet/${board}/${id}`)
            .then(({ data }) => {
                setCareSheet(data.success ? data.careSheet : null)
            })
            .catch(() => {
                setCareSheet(null)
            })
            .finally(() => {
                setLoading(false)
            })
    }, [board, id])

    const fields = careSheet ? parseDescription(careSheet.description) : {}
    const canManage = !!(careSheet && (careSheet.uploaderId === userId || isAdmin))

    const deleteCareSheet = async () => {
        if (deleting || !window.confirm('사육 정보를 삭제하시겠습니까?')) return
        setDeleting(true)
        try {
            const { data } = await api.delete(`/care-sheet/${board}/${id}`)
            if (data.success) {
                navigate(`/care-sheet/${board}`)
            } else {
                alert(data.message)
            }
        } catch {
            alert('삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="home">
            <SiteHeader />

            <main>
                <section className="section board-page">
                    {loading ? (
                        <div className="board-empty">불러오는 중...</div>
                    ) : !careSheet ? (
                        <div className="board-empty">사육 정보를 찾을 수 없습니다.</div>
                    ) : (
                        <article className="care-sheet-detail">
                            {careSheet.imgsPath.length > 0 && (
                                <div className="care-sheet-gallery">
                                    {careSheet.imgsPath.map((src) => (
                                        <img key={src} src={`${api.defaults.baseURL}${src}`} alt={careSheet.subSpecies} />
                                    ))}
                                </div>
                            )}

                            <div className="post-detail-head">
                                <span className={`chip ${config.chipClass}`}>{config.title.replace(' 게시판', '')}</span>
                                <h1>{careSheet.subSpecies}</h1>
                            </div>
                            <p className="care-sheet-scientific-name">{careSheet.species}</p>
                            <p className="post-detail-meta">
                                <Link to={`/users/${careSheet.uploaderId}`} className="author-link">{careSheet.uploaderName}</Link>
                                {' '}· {formatDateTime(careSheet.createdAt)} · 조회 {careSheet.view_count} · 추천 {careSheet.like_count}
                            </p>

                            <dl className="care-sheet-specs">
                                {SPEC_LABELS.map((label) => (
                                    fields[label] ? (
                                        <div key={label} className="care-sheet-spec-row">
                                            <dt>{label}</dt>
                                            <dd>{fields[label]}</dd>
                                        </div>
                                    ) : null
                                ))}
                            </dl>

                            {fields['추가설명'] && (
                                <div className="care-sheet-extra">
                                    <h2>추가설명</h2>
                                    <p>{fields['추가설명']}</p>
                                </div>
                            )}
                        </article>
                    )}

                    <div className="post-detail-actions">
                        {canManage && (
                            <>
                                <Link to={`/care-sheet/${board}/${id}/edit`} className="btn btn-ghost">수정</Link>
                                <button type="button" className="btn btn-danger" onClick={deleteCareSheet} disabled={deleting}>
                                    삭제
                                </button>
                            </>
                        )}
                        <Link to={`/care-sheet/${board}`} className="btn btn-ghost">목록으로</Link>
                    </div>
                </section>
            </main>

            <footer className="site-footer">
                <p>© 2026 우리들의 등,배각류 공간 · 낙엽 아래 작은 세계를 사랑하는 사람들</p>
            </footer>
        </div>
    )
}

export default CareSheetDetail
