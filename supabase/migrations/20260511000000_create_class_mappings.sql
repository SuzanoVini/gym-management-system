CREATE TABLE class_mappings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zenplanner_name  text UNIQUE NOT NULL,
  system_name      text NOT NULL,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE class_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view class mappings" ON class_mappings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage class mappings" ON class_mappings
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Seed from current CLASS_MAP
INSERT INTO class_mappings (zenplanner_name, system_name) VALUES
  ('Jiu-Jitsu (Adults | GB1 & GB2)',                  'GB 1/2'),
  ('Jiu-Jitsu Competition Class (Adults | GB2)',       'GB2'),
  ('Jiu-Jitsu Drills (Adults)',                        'Jiu-Jitsu Drills'),
  ('Jiu-Jitsu Drills (Adults) - NO GI',               'Jiu-Jitsu Drills'),
  ('Jiu-Jitsu Fundamentals (Adults | GB1)',            'GB1'),
  ('Jiu-Jitsu No Gi (Adults | All Levels)',            'No Gi'),
  ('Jiu-Jitsu No Gi (Adults | GB2) ADVANCED',         'No Gi'),
  ('Jiu-Jitsu No Gi - Leg Locks',                     'No Gi'),
  ('Jiu-Jitsu Women''s Only (Adults | All Levels)',   'Women''s'),
  ('Muay Thai (Adults)',                               'MUAY THAI'),
  ('Judo (Adults)',                                    'Judo'),
  ('Kids & Parents (All Ages)',                        'Kids & Parents'),
  ('Kids (All Ages)',                                  'Kids All Ages'),
  ('Little Champions 2 (Kids 6 - 8 yo)',              'Kids 6 - 8 yo'),
  ('Little Champions 2 (Kids 6 - 8 yo) - NO GI',     'Kids 6 - 8 yo'),
  ('Tiny & Little Champions 1 (Kids 3 - 5 yo)',       'Kids 3 - 6 yo'),
  ('Tiny & Little Champions 1 (Kids 3 - 5 yo) - NO GI', 'Kids 3 - 6 yo'),
  ('Juniors & Teens (9 - 13 yo)',                     'Juniors & Teens'),
  ('Juniors & Teens (9 - 13 yo) - NO GI',            'Juniors & Teens'),
  ('Kids Muay Thai',                                   'MUAY THAI');
