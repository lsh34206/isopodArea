// careSheet 스키마의 description은 "라벨:값" 템플릿 텍스트 하나로 저장되어 있어
// 작성/조회 양쪽에서 같은 라벨 목록으로 조립하고 다시 분해한다.
export const FIELD_LABELS = ['학명', '관용명', '난이도', '적정온도', '적정습도', '먹이', '습성', '성장속도', '추가설명'] as const

export interface CareSheetFields {
    species: string
    subSpecies: string
    difficulty: string
    temperature: string
    humidity: string
    food: string
    behavior: string
    growthSpeed: string
    extra: string
}

export function buildDescription(fields: CareSheetFields) {
    return (
        `학명:${fields.species}\n` +
        `관용명:${fields.subSpecies}\n` +
        `난이도:${fields.difficulty}\n` +
        `적정온도:${fields.temperature}\n` +
        `적정습도:${fields.humidity}\n` +
        `먹이:${fields.food}\n` +
        `습성:${fields.behavior}\n` +
        `성장속도:${fields.growthSpeed}\n` +
        `추가설명:${fields.extra}`
    )
}

export function parseDescription(description: string) {
    const fields: Record<string, string> = {}
    let currentLabel: string | null = null

    for (const line of description.replace(/\r\n?/g, '\n').split('\n')) {
        const matched = FIELD_LABELS.find((label) => line.startsWith(`${label}:`))
        if (matched) {
            currentLabel = matched
            fields[matched] = line.slice(matched.length + 1)
        } else if (currentLabel) {
            fields[currentLabel] += `\n${line}`
        }
    }

    return fields
}
