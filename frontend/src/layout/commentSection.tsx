import { useState } from 'react'
import { Link } from 'react-router-dom'

export interface Comment {
    _id: string
    content: string
    parentId: string | null
    writerId: string
    writerName: string
    createdAt: string
}

function formatDateTime(value: string) {
    const date = new Date(value)
    if (isNaN(date.getTime())) return ''
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mi = String(date.getMinutes()).padStart(2, '0')
    return `${date.getFullYear()}-${mm}-${dd} ${hh}:${mi}`
}

function CommentForm({ onSubmit, placeholder, submitLabel, onCancel, initialContent = '' }: {
    onSubmit: (content: string) => Promise<void>
    placeholder: string
    submitLabel: string
    onCancel?: () => void
    initialContent?: string
}) {
    const [content, setContent] = useState(initialContent)
    const [submitting, setSubmitting] = useState(false)

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!content.trim() || submitting) return
        setSubmitting(true)
        try {
            await onSubmit(content.trim())
            setContent('')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form onSubmit={submit} className="comment-form">
            <textarea
                className="field"
                placeholder={placeholder}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
            />
            <div className="comment-form-actions">
                {onCancel && (
                    <button type="button" className="btn btn-ghost" onClick={onCancel}>취소</button>
                )}
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitLabel}</button>
            </div>
        </form>
    )
}

interface CommentSectionProps {
    comments: Comment[]
    loggedIn: boolean
    currentUserId: string | null
    onSubmit: (content: string, parentId: string | null) => Promise<void>
    onEdit: (commentId: string, content: string) => Promise<void>
    onDelete: (commentId: string) => Promise<void>
}

function CommentSection({ comments, loggedIn, currentUserId, onSubmit, onEdit, onDelete }: CommentSectionProps) {
    const [replyTo, setReplyTo] = useState<string | null>(null)
    const [editing, setEditing] = useState<string | null>(null)

    const topComments = comments.filter((c) => !c.parentId)
    const repliesOf = (parentId: string) => comments.filter((c) => c.parentId === parentId)

    const submit = async (content: string, parentId: string | null) => {
        await onSubmit(content, parentId)
        setReplyTo(null)
    }

    const save = async (commentId: string, content: string) => {
        await onEdit(commentId, content)
        setEditing(null)
    }

    const remove = (commentId: string) => {
        if (window.confirm('댓글을 삭제하시겠습니까?')) {
            onDelete(commentId)
        }
    }

    const renderComment = (comment: Comment, isReply: boolean) => (
        <>
            <p className="comment-meta">
                <Link to={`/users/${comment.writerId}`} className="comment-writer author-link">{comment.writerName}</Link>
                <span>{formatDateTime(comment.createdAt)}</span>
            </p>

            {editing === comment._id ? (
                <CommentForm
                    placeholder="댓글을 입력해 주세요."
                    submitLabel="수정 완료"
                    initialContent={comment.content}
                    onCancel={() => setEditing(null)}
                    onSubmit={(content) => save(comment._id, content)}
                />
            ) : (
                <>
                    <p className="comment-content">{comment.content}</p>
                    <div className="comment-actions">
                        {!isReply && loggedIn && (
                            <button
                                type="button"
                                className="comment-reply-btn"
                                onClick={() => setReplyTo(replyTo === comment._id ? null : comment._id)}
                            >
                                답글
                            </button>
                        )}
                        {comment.writerId === currentUserId && (
                            <>
                                <button
                                    type="button"
                                    className="comment-edit-btn"
                                    onClick={() => setEditing(comment._id)}
                                >
                                    수정
                                </button>
                                <button
                                    type="button"
                                    className="comment-delete-btn"
                                    onClick={() => remove(comment._id)}
                                >
                                    삭제
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}

            {!isReply && replyTo === comment._id && (
                <CommentForm
                    placeholder={`${comment.writerName}님에게 답글 남기기`}
                    submitLabel="답글 등록"
                    onCancel={() => setReplyTo(null)}
                    onSubmit={(content) => submit(content, comment._id)}
                />
            )}
        </>
    )

    return (
        <section className="comment-section">
            <h2 className="comment-section-title">댓글 {comments.length}</h2>

            {loggedIn ? (
                <CommentForm
                    placeholder="댓글을 입력해 주세요."
                    submitLabel="댓글 등록"
                    onSubmit={(content) => submit(content, null)}
                />
            ) : (
                <p className="comment-login-notice">
                    댓글을 작성하려면 <Link to="/login">로그인</Link>해 주세요.
                </p>
            )}

            {topComments.length === 0 ? (
                <p className="comment-empty">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>
            ) : (
                <ul className="comment-list">
                    {topComments.map((comment) => (
                        <li key={comment._id} className="comment-item">
                            {renderComment(comment, false)}

                            {repliesOf(comment._id).length > 0 && (
                                <ul className="comment-reply-list">
                                    {repliesOf(comment._id).map((reply) => (
                                        <li key={reply._id} className="comment-item comment-reply">
                                            {renderComment(reply, true)}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}

export default CommentSection
