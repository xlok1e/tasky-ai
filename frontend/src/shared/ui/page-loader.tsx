'use client'

import { Spinner } from '@shared/ui/spinner'

function PageLoader() {
	return (
		<div className='absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none'>
			<Spinner className='size-8 text-primary' />
			<span className='text-sm text-primary'>Загрузка...</span>
		</div>
	)
}

export { PageLoader }
