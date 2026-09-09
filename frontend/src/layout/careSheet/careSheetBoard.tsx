import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import SiteHeader from '../header'
import Avatar from '../avatar'
import { api } from '../../api'
import { boardConfigs, defaultBoardConfig } from '../community/boardConfig'
import '../../App.css'

const boards = ['isopod', 'millipede'] as const

interface CareSheetSummary {
    _id: string
    species: string
    subSpecies: string
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

function CareSheetBoard() {
    const { board = '' } = useParams()
    const config = boardConfigs[board] ?? defaultBoardConfig
    const [careSheets, setCareSheets] = useState<CareSheetSummary[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let ignore = false
        setLoading(true)
        api.get(`/care-sheet/${board}`)
            .then(({ data }) => {
                if (!ignore) setCareSheets(data.success ? data.careSheets : [])
            })
            .catch(() => {
                if (!ignore) setCareSheets([])
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
                        <span className="board-head-icon" aria-hidden>📗</span>
                        <div>
                            <h1 className="board-head-title">{config.title.replace(' 게시판', ' 사육 정보')}</h1>
                            <p className="board-head-desc">바닥재, 습도, 먹이, 사육장 세팅까지 검증된 노하우 아카이브.</p>
                        </div>
                    </div>

                    <div className="board-toolbar">
                        <div className="board-tabs" role="tablist">
                            {boards.map((b) => (
                                <Link
                                    key={b}
                                    to={`/care-sheet/${b}`}
                                    role="tab"
                                    aria-selected={board === b}
                                    className={board === b ? 'board-tab active' : 'board-tab'}
                                >
                                    {boardConfigs[b].icon} {boardConfigs[b].title.replace(' 게시판', '')}
                                </Link>
                            ))}
                        </div>
                        <Link to={`/care-sheet/write?type=${board}`} className="btn btn-primary">
                            작성하기
                        </Link>
                    </div>

                    {loading ? (
                        <div className="board-empty">불러오는 중...</div>
                    ) : careSheets.length === 0 ? (
                        <div className="board-empty">아직 등록된 사육 정보가 없습니다. 첫 케어시트를 남겨보세요!</div>
                    ) : (
                        <div className="care-sheet-grid">
                            {careSheets.map((cs) => (
                                <div key={cs._id} className="care-sheet-card">
                                    <Link to={`/care-sheet/${board}/${cs._id}`} className="care-sheet-card-link">
                                        <div className="care-sheet-thumb">
                                            {cs.imgsPath[0] ? (
                                                <img src={`${api.defaults.baseURL}${cs.imgsPath[0]}`} alt={cs.subSpecies} />
                                            ) : (
                                                <span aria-hidden>{config.icon}</span>
                                            )}
                                        </div>
                                        <div className="care-sheet-card-body">
                                            <p className="care-sheet-name">{cs.subSpecies}</p>
                                            <p className="care-sheet-species">{cs.species}</p>
                                        </div>
                                    </Link>
                                    <p className="post-meta care-sheet-card-meta">
                                        <span className="author-with-avatar">
                                            <Avatar src={cs.uploaderAvatar} size={20} />
                                            <Link to={`/users/${cs.uploaderId}`} className="author-link">{cs.uploaderName}</Link>
                                        </span>
                                        {' '}· {formatDate(cs.createdAt)} · 조회 {cs.view_count}
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

export default CareSheetBoard
