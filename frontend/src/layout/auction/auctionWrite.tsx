import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import SiteHeader from '../header'
import { api } from '../../api'
import { boardConfigs } from '../community/boardConfig'
import '../../App.css'

type Board = 'isopod' | 'millipede'

const MAX_IMAGES = 10
const DURATION_PRESETS = [
    { label: '30분', minutes: 30 },
    { label: '1시간', minutes: 60 },
    { label: '6시간', minutes: 60 * 6 },
    { label: '1일', minutes: 60 * 24 },
    { label: '3일', minutes: 60 * 24 * 3 },
]

interface ImagePreview {
    file: File
    url: string
}

function AuctionWrite() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const initialBoard = searchParams.get('type')
    const [board, setBoard] = useState<Board>(initialBoard === 'millipede' ? 'millipede' : 'isopod')

    const [title, setTitle] = useState('')
    const [species, setSpecies] = useState('')
    const [subSpecies, setSubSpecies] = useState('')
    const [description, setDescription] = useState('')
    const [startBid, setStartBid] = useState('')
    const [durationMinutes, setDurationMinutes] = useState(60)
    const [images, setImages] = useState<ImagePreview[]>([])
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        api.get('/auth/me')
            .then(({ data }) => {
                if (!data.success) {
                    alert('로그인이 필요합니다.')
                    navigate('/login')
                }
            })
            .catch(() => {})
    }, [navigate])

    useEffect(() => {
        return () => {
            images.forEach((img) => URL.revokeObjectURL(img.url))
        }
    }, [images])

    const addImages = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? [])
        setImages((prev) => {
            const remaining = MAX_IMAGES - prev.length
            if (remaining <= 0) {
                alert(`사진은 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`)
                return prev
            }
            if (files.length > remaining) {
                alert(`사진은 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`)
            }
            return [...prev, ...files.slice(0, remaining).map((file) => ({ file, url: URL.createObjectURL(file) }))]
        })
        e.target.value = ''
    }

    const removeImage = (url: string) => {
        setImages((prev) => {
            URL.revokeObjectURL(url)
            return prev.filter((img) => img.url !== url)
        })
    }

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!title.trim() || !species.trim() || !subSpecies.trim() || !description.trim()) {
            alert('제목, 학명, 관용명, 설명을 모두 입력해 주세요.')
            return
        }
        if (images.length === 0) {
            alert('사진을 1장 이상 첨부해 주세요.')
            return
        }

        const formData = new FormData()
        formData.append('title', title.trim())
        formData.append('species', species.trim())
        formData.append('subSpecies', subSpecies.trim())
        formData.append('description', description.trim())
        formData.append('startBid', startBid || '0')
        formData.append('durationMinutes', String(durationMinutes))
        images.forEach((img) => formData.append('images', img.file))

        setSubmitting(true)
        try {
            const { data } = await api.post(`/auction/${board}`, formData)
            if (data.success) {
                alert(data.message)
                navigate(`/auction/${board}/${data.auction._id}`)
            } else {
                alert(data.message)
            }
        } catch {
            alert('경매 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="home">
            <SiteHeader />

            <main>
                <section className="section board-page">
                    <div className="board-head">
                        <span className="board-head-icon" aria-hidden>🔨</span>
                        <div>
                            <h1 className="board-head-title">경매 등록</h1>
                            <p className="board-head-desc">실시간으로 입찰받을 개체를 등록해 보세요.</p>
                        </div>
                    </div>

                    <form onSubmit={submit} className="form-stack care-sheet-form">
                        <div className="board-tabs" role="radiogroup" aria-label="분류">
                            {(['isopod', 'millipede'] as Board[]).map((b) => (
                                <button
                                    key={b}
                                    type="button"
                                    role="radio"
                                    aria-checked={board === b}
                                    className={board === b ? 'board-tab active' : 'board-tab'}
                                    onClick={() => setBoard(b)}
                                >
                                    {boardConfigs[b].icon} {boardConfigs[b].title.replace(' 게시판', '')}
                                </button>
                            ))}
                        </div>

                        <label className="field-group">
                            <span className="field-label">제목</span>
                            <input
                                className="field"
                                type="text"
                                placeholder="예: 루비 더키 성체 페어 경매"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </label>

                        <div className="field-row">
                            <label className="field-group">
                                <span className="field-label">학명</span>
                                <input
                                    className="field"
                                    type="text"
                                    placeholder="예: Porcellio scaber"
                                    value={species}
                                    onChange={(e) => setSpecies(e.target.value)}
                                    required
                                />
                            </label>

                            <label className="field-group">
                                <span className="field-label">관용명</span>
                                <input
                                    className="field"
                                    type="text"
                                    placeholder="예: 쥐며느리"
                                    value={subSpecies}
                                    onChange={(e) => setSubSpecies(e.target.value)}
                                    required
                                />
                            </label>
                        </div>

                        <label className="field-group">
                            <span className="field-label">시작가 (원)</span>
                            <input
                                className="field"
                                type="number"
                                min={1000}
                                step={100}
                                placeholder="1000"
                                value={startBid}
                                onChange={(e) => setStartBid(e.target.value)}
                                required
                            />
                        </label>

                        <div className="field-group">
                            <span className="field-label">경매 시간</span>
                            <div className="board-tabs" role="radiogroup" aria-label="경매 시간">
                                {DURATION_PRESETS.map((preset) => (
                                    <button
                                        key={preset.minutes}
                                        type="button"
                                        role="radio"
                                        aria-checked={durationMinutes === preset.minutes}
                                        className={durationMinutes === preset.minutes ? 'board-tab active' : 'board-tab'}
                                        onClick={() => setDurationMinutes(preset.minutes)}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <label className="field-group">
                            <span className="field-label">설명</span>
                            <textarea
                                className="field"
                                placeholder="개체 상태, 크기, 마리 수, 직거래/택배 가능 여부 등을 자유롭게 적어주세요."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                        </label>

                        <div className="field-group">
                            <span className="field-label">사진 (최대 {MAX_IMAGES}장)</span>
                            <input
                                className="field"
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={addImages}
                                disabled={images.length >= MAX_IMAGES}
                            />
                            {images.length > 0 && (
                                <ul className="image-preview-list">
                                    {images.map((img) => (
                                        <li key={img.url} className="image-preview-item">
                                            <img src={img.url} alt="" />
                                            <button type="button" onClick={() => removeImage(img.url)} aria-label="사진 삭제">✕</button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="write-actions">
                            <Link to={`/auction/${board}`} className="btn btn-ghost">취소</Link>
                            <button className="btn btn-primary" type="submit" disabled={submitting}>등록</button>
                        </div>
                    </form>
                </section>
            </main>

            <footer className="site-footer">
                <p>© 2026 우리들의 등,배각류 공간 · 낙엽 아래 작은 세계를 사랑하는 사람들</p>
            </footer>
        </div>
    )
}

export default AuctionWrite
