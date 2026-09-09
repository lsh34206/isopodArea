import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import SiteHeader from '../header'
import { api } from '../../api'
import { boardConfigs, defaultBoardConfig } from './boardConfig'
import '../../App.css'

const boardTypes = [
    { key: 'free', label: '자유' },
    { key: 'library', label: '자료' },
    { key: 'question', label: '질문' },
    { key: 'notice', label: '공지' },
] as const

type BoardType = (typeof boardTypes)[number]['key']

const MAX_IMAGES = 10

interface ImagePreview {
    file: File
    url: string
}

function CommunityWrite() {
    const { board = '', type: typeParam, id } = useParams()
    const isEdit = !!id
    const config = boardConfigs[board] ?? defaultBoardConfig
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const initialType = typeParam ?? searchParams.get('type')
    const [type, setType] = useState<BoardType>(
        boardTypes.some((t) => t.key === initialType) ? (initialType as BoardType) : 'free',
    )
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
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
        api.get(`/community/${board}/${type}/${id}`)
            .then(({ data }) => {
                if (data.success) {
                    setTitle(data.post.title)
                    setContent(data.post.content)
                    setExistingImages(data.post.imgsPath ?? [])
                } else {
                    alert(data.message)
                    navigate(`/community/${board}`)
                }
            })
            .catch(() => {
                alert('게시글을 불러오지 못했습니다.')
                navigate(`/community/${board}`)
            })
            .finally(() => setLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        return () => {
            images.forEach((img) => URL.revokeObjectURL(img.url))
        }
    }, [images])

    const totalImageCount = existingImages.length + images.length

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
        if (!title.trim() || !content.trim()) return

        const formData = new FormData()
        formData.append('title', title.trim())
        formData.append('content', content.trim())
        existingImages.forEach((path) => formData.append('keepImages', path))
        images.forEach((img) => formData.append('images', img.file))

        setSubmitting(true)
        try {
            const { data } = isEdit
                ? await api.patch(`/community/${board}/${type}/${id}`, formData)
                : await api.post(`/community/${board}/${type}`, formData)
            if (data.success) {
                navigate(`/community/${board}/${type}/${data.post._id}`)
            } else {
                alert(data.message)
            }
        } catch {
            alert(isEdit ? '게시글 수정에 실패했습니다. 잠시 후 다시 시도해 주세요.' : '게시글 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.')
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
                        <span className="board-head-icon" aria-hidden>{config.icon}</span>
                        <div>
                            <h1 className="board-head-title">{isEdit ? '글 수정' : '글쓰기'}</h1>
                            <p className="board-head-desc">{config.title}에 {isEdit ? '작성한 글을 수정합니다.' : '새 글을 작성합니다.'}</p>
                        </div>
                    </div>

                    <form onSubmit={submit} className="form-stack">
                        {isEdit ? (
                            <span className={`chip ${config.chipClass}`}>{boardTypes.find((t) => t.key === type)?.label}</span>
                        ) : (
                            <div className="board-tabs" role="radiogroup" aria-label="게시글 유형">
                                {boardTypes.map((t) => (
                                    <button
                                        key={t.key}
                                        type="button"
                                        role="radio"
                                        aria-checked={type === t.key}
                                        className={type === t.key ? 'board-tab active' : 'board-tab'}
                                        onClick={() => setType(t.key)}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        <input
                            className="field"
                            type="text"
                            placeholder="제목"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                        <textarea
                            className="field"
                            placeholder="내용을 입력해 주세요."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />

                        <div className="field-group">
                            <span className="field-label">사진 첨부 (최대 {MAX_IMAGES}장)</span>
                            <input
                                className="field"
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={addImages}
                                disabled={totalImageCount >= MAX_IMAGES}
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
                            <Link to={isEdit ? `/community/${board}/${type}/${id}` : `/community/${board}`} className="btn btn-ghost">취소</Link>
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

export default CommunityWrite
