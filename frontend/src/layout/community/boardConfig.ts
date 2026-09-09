export interface BoardConfig {
    icon: string
    title: string
    description: string
    chipClass: string
}

export const boardConfigs: Record<string, BoardConfig> = {
    isopod: {
        icon: '🦐',
        title: '등각류 게시판',
        description: '쥐며느리부터 쿠바리스,아르덴티엘라,필리피노딜로 등등 — 등각류 사육 이야기를 나눠요.',
        chipClass: 'chip-iso',
    },
    millipede: {
        icon: '🐛',
        title: '배각류 게시판',
        description: '밀리피드,메가볼의 사육, 탈피, 번식에 대한 모든 이야기가 모이는 곳.',
        chipClass: 'chip-milli',
    },
}

export const defaultBoardConfig: BoardConfig = {
    icon: '📋',
    title: '게시판',
    description: '',
    chipClass: 'chip',
}
