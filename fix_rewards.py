import sys

with open('temp_profile.txt', 'r', encoding='utf-16') as f:
    text = f.read()

# Find the start of the recompensas block
start_marker = "          ) : activeTab === 'recompensas' ? ("
start_idx = text.find(start_marker)
end_marker = "          ) : activeTab === 'premios' ? ("
end_idx = text.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print('Markers not found')
    sys.exit(1)

jsx_content = text[start_idx + len(start_marker) : end_idx].strip()

# Now find the promo modal at the end
promo_marker = '{/* Promo Code Modal */}'
promo_idx = text.find(promo_marker)
withdraw_marker = '{/* Withdraw Modal */}'
withdraw_idx = text.find(withdraw_marker)
promo_modal = text[promo_idx : withdraw_idx].strip()

# Create the new return block
new_return = f"""  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {jsx_content}
      </div>
      <AnimatePresence>
        {promo_modal}
      </AnimatePresence>
    </div>
  )
}}"""

# Find where the LAST return block starts in the file
# The main component's return is the last '  return ('
return_start = text.rfind('  return (')

# Combine top part up to return with new_return
new_file_content = text[:return_start] + new_return

new_file_content = new_file_content.replace('export default function Profile()', 'export default function Rewards()')

with open('src/pages/public/Rewards.tsx', 'w', encoding='utf-8') as f:
    f.write(new_file_content)

print('Success')
