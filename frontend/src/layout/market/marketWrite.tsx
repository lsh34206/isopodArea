import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import SiteHeader from '../header'
import { api } from '../../api'
import { boardConfigs } from '../community/boardConfig'
import '../../App.css'

type Board = 'isopod' | 'millipede'
type TransactionType = '분양' | '나눔'

const MAX_IMAGES = 10

interface ImagePreview {
    file: File
    url: string
}

function MarketWrite() {
    const navigate = useNavigate()
    const { board: boardParam, id } = useParams()
    const isEdit = !!id
    const [searchParams] = useSearchParams()
    const initialBoard = boardParam ?? searchParams.get('type')
    const [board, setBoard] = useState<Board>(initialBoard === 'millipede' ? 'millipede' : 'isopod')

    const [transactionType, setTransactionType] = useState<TransactionType>('분양')
    const [title, setTitle] = useState('')
    const [price, setPrice] = useState('')
    const [species, setSpecies] = useState('')
    const [subSpecies, setSubSpecies] = useState('')
    const [description, setDescription] = useState('')
    const [existingImages, setExistingImages] = useState<string[]>([])
    const [images, setImages] = useState<ImagePreview[]>([])
    const [loading, setLoading] = useState(isEdit)
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
        if (!isEdit) return
        api.get(`/market/${board}/${id}`)
            .then(({ data }) => {
                if (data.success) {
                    setTransactionType(data.listing.transactionType === '나눔' ? '나눔' : '분양')
                    setTitle(data.listing.title)
                    setPrice(String(data.listing.price))
                    setSpecies(data.listing.species)
                    setSubSpecies(data.listing.subSpecies)
                    setDescription(data.listing.description)
                    setExistingImages(data.listing.imgsPath ?? [])
                } else {
                    alert(data.message)
                    navigate(`/market/${board}`)
                }
            })
            .catch(() => {
                alert('분양글을 불러오지 못했습니다.')
                navigate(`/market/${board}`)
            })
            .finally(() => setLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        return () => {
            images.forEach((img) => URL.revokeObjectURL(img.url))
        }
    }, [images])

    useEffect(() => {
        if (transactionType === '나눔') {
            setPrice('0')
        }
    }, [transactionType])

    const addImages = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? [])
        setImages((prev) => {
            const remaining = MAX_IMAGES - existingImages.length - prev.length
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

    const removeExistingImage = (path: string) => {
        setExistingImages((prev) => prev.filter((p) => p !== path))
    }

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!title.trim() || !species.trim() || !subSpecies.trim() || !description.trim()) {
            alert('제목, 학명, 관용명, 설명을 모두 입력해 주세요.')
            return
        }
        if (existingImages.length + images.length === 0) {
            alert('사진을 1장 이상 첨부해 주세요.')
            return
        }

        const formData = new FormData()
        formData.append('title', title.trim())
        formData.append('transactionType', transactionType)
        formData.append('price', price || '0')
        formData.append('species', species.trim())
        formData.append('subSpecies', subSpecies.trim())
        formData.append('description', description.trim())
        if (isEdit) {
            existingImages.forEach((path) => formData.append('keepImages', path))
        }
        images.forEach((img) => formData.append('images', img.file))

        setSubmitting(true)
        try {
            const { data } = isEdit
                ? await api.patch(`/market/${board}/${id}`, formData)
                : await api.post(`/market/${board}`, formData)
            if (data.success) {
                alert(data.message)
                navigate(`/market/${board}/${data.listing._id}`)
            } else {
                alert(data.message)
            }
        } catch {
            alert(isEdit ? '분양글 수정에 실패했습니다. 잠시 후 다시 시도해 주세요.' : '분양글 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        } finally {
            setSubmitting(false)
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
                        <span className="board-head-icon" aria-hidden>🐚</span>
                        <div>
                            <h1 className="board-head-title">{isEdit ? '분양 글 수정' : '분양 글쓰기'}</h1>
                            <p className="board-head-desc">직접 기르는 개체를 분양하거나 무료로 나눠보세요.</p>
                        </div>
                    </div>

                    <form onSubmit={submit} className="form-stack care-sheet-form">
                        {isEdit ? (
                            <span className={`chip ${boardConfigs[board].chipClass}`}>{boardConfigs[board].title.replace(' 게시판', '')}</span>
                        ) : (
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
                        )}

                        <div className="board-tabs" role="radiogroup" aria-label="거래 유형">
                            {(['분양', '나눔'] as TransactionType[]).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    role="radio"
                                    aria-checked={transactionType === t}
                                    className={transactionType === t ? 'board-tab active' : 'board-tab'}
                                    onClick={() => setTransactionType(t)}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        <label className="field-group">
                            <span className="field-label">제목</span>
                            <input
                                className="field"
                                type="text"
                                placeholder="예: 다이어리 카우 유체 5마리 분양합니다"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </label>

                        <label className="field-group">
                            <span className="field-label">가격 (원)</span>
                            <input
                                className="field"
                                type="number"
                                min={0}
                                step={100}
                                placeholder="0"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                disabled={transactionType === '나눔'}
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
                            <span className="field-label">설명</span>
                            <textarea
                                className="field"
                                placeholder="개체 수, 크기, 상태, 거래 방법 등을 자유롭게 적어주세요."
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
                                disabled={existingImages.length + images.length >= MAX_IMAGES}
                            />
                            {(existingImages.length > 0 || images.length > 0) && (
                                <ul className="image-preview-list">
                                    {existingImages.map((path) => (
                                        <li key={path} className="image-preview-item">
                                            <img src={`${api.defaults.baseURL}${path}`} alt="" />
                                            <button type="button" onClick={() => removeExistingImage(path)} aria-label="사진 삭제">✕</button>
                                        </li>
                                    ))}
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
                            <Link to={isEdit ? `/market/${board}/${id}` : `/market/${board}`} className="btn btn-ghost">취소</Link>
                            <button className="btn btn-primary" type="submit" disabled={submitting}>{isEdit ? '수정 완료' : '등록'}</button>
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

export default MarketWrite
