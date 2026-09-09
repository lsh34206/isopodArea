import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../../api'
import '../../App.css'

type AuthMode = 'login' | 'signup'

function Login() {
    const location = useLocation()
    const [mode, setMode] = useState<AuthMode>(
        location.pathname === '/signup' ? 'signup' : 'login',
    )

    const login = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        try {
            const { data } = await api.post('/auth/login', {
                email: form.get('email'),
                password: form.get('password'),
            })
            if (data.success) {
                alert(data.message)
                window.location.href = '/home'
            } else {
                alert(data.message)
            }
        } catch {
            alert('로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        }
    }

    const signup = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formEl = e.currentTarget
        const form = new FormData(formEl)
        const password = form.get('password') as string
        const passwordCheck = form.get('passwordCheck') as string

        if (password !== passwordCheck) {
            alert('비밀번호가 일치하지 않습니다.')
            return
        }

        try {
            const { data } = await api.post('/auth/signup', {
                name: form.get('name'),
                email: form.get('email'),
                password: password,
                phone: form.get('phone') || '',
            })
            alert(data.message)
            if (data.success) {
                formEl.reset()
                setMode('login')
            }
        } catch {
            alert('회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        }
    }

    return (
        <div className='Login auth-wrap'>
            <div className='auth-card'>
                <Link to='/' className='auth-brand'>
                    <span aria-hidden>🌿</span> 우리들의 등,배각류 공간
                </Link>

                <div className='auth-tabs' role='tablist'>
                    <button
                        type='button'
                        role='tab'
                        aria-selected={mode === 'login'}
                        className={mode === 'login' ? 'auth-tab active' : 'auth-tab'}
                        onClick={() => setMode('login')}
                    >
                        로그인
                    </button>
                    <button
                        type='button'
                        role='tab'
                        aria-selected={mode === 'signup'}
                        className={mode === 'signup' ? 'auth-tab active' : 'auth-tab'}
                        onClick={() => setMode('signup')}
                    >
                        회원가입
                    </button>
                </div>

                {mode === 'login' ? (
                    <form onSubmit={login} className='form-stack'>
                        <input className='field' type='email' placeholder='이메일' name='email' required />
                        <input className='field' type='password' placeholder='비밀번호' name='password' required />
                        <button className='btn btn-primary btn-block' type='submit'>로그인</button>
                        <p className='auth-switch'>
                            아직 회원이 아니신가요?{' '}
                            <button type='button' onClick={() => setMode('signup')}>회원가입</button>
                        </p>
                    </form>
                ) : (
                    <form onSubmit={signup} className='form-stack'>
                        <input className='field' type='text' placeholder='이름' name='name' required />
                        <input className='field' type='email' placeholder='이메일' name='email' required />
                        <input className='field' type='password' placeholder='비밀번호' name='password' minLength={8} required />
                        <input className='field' type='password' placeholder='비밀번호 확인' name='passwordCheck' minLength={8} required />
                        <input className='field' type='tel' placeholder='전화번호 (선택)' name='phone' />
                        <button className='btn btn-primary btn-block' type='submit'>회원가입</button>
                        <p className='auth-switch'>
                            이미 계정이 있으신가요?{' '}
                            <button type='button' onClick={() => setMode('login')}>로그인</button>
                        </p>
                    </form>
                )}
            </div>
        </div>
    )
}

export default Login
